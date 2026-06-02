import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { geocodeAddress } from '../services/geocodingService';
import { fetchRentCastListings } from '../services/rentCastService';
import { fetchOSMTrails } from '../services/overpassService';
import { config } from '../config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Services & Cache', () => {
  const cacheDir = path.join(__dirname, '../../data/cache');

  beforeEach(() => {
    jest.clearAllMocks();
    // Clean up cache directory if exists
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up cache directory
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
  });

  describe('Geocoding Service (Nominatim)', () => {
    it('should successfully geocode an address and cache the result', async () => {
      const mockGeoResponse = [
        {
          lat: '40.0150',
          lon: '-105.2705',
          display_name: 'Boulder, Colorado, USA',
          address: {
            city: 'Boulder',
            state: 'Colorado',
            postcode: '80302',
            country: 'United States',
            country_code: 'us'
          }
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockGeoResponse, status: 200 });

      const result = await geocodeAddress('Boulder, CO');

      expect(result).toEqual({
        lat: 40.0150,
        lon: -105.2705,
        display_name: 'Boulder, Colorado, USA',
        address: {
          city: 'Boulder',
          state: 'Colorado',
          postcode: '80302',
          country: 'United States',
          country_code: 'us'
        }
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/search',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'Boulder, CO',
            format: 'json',
            limit: 1,
            countrycodes: 'us'
          })
        })
      );

      // Verify cached file exists
      const cachedFiles = fs.readdirSync(cacheDir);
      expect(cachedFiles.length).toBeGreaterThan(0);
      expect(cachedFiles.some(f => f.startsWith('geocode_'))).toBe(true);

      // Call again, should use cache and NOT trigger axios
      const secondResult = await geocodeAddress('Boulder, CO');
      expect(secondResult).toEqual(result);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should throw an error if no results are found', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [], status: 200 });

      await expect(geocodeAddress('UnknownPlacexyz')).rejects.toThrow('Location "UnknownPlacexyz" not found.');
    });
  });

  describe('RentCast Service', () => {
    it('should fetch active listings and cache the result', async () => {
      const mockListings = [
        {
          id: 'rentcast_1',
          formattedAddress: '123 Pine St, Boulder, CO 80302',
          price: 550000,
          bedrooms: 2,
          bathrooms: 1.5,
          squareFootage: 1200,
          propertyType: 'Condo',
          latitude: 40.0160,
          longitude: -105.2715,
          status: 'Active'
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockListings, status: 200 });

      const result = await fetchRentCastListings(40.0150, -105.2705, { postcode: '80302' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].id).toBe('rentcast_1');
      expect(result.fallback).toBe(false);

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.rentcast.io/v1/listings/sale',
        expect.objectContaining({
          params: expect.objectContaining({
            zipCode: '80302',
            status: 'active',
            limit: 50
          })
        })
      );

      // Call again, should load from cache
      const secondResult = await fetchRentCastListings(40.0150, -105.2705, { postcode: '80302' });
      expect(secondResult.properties).toEqual(result.properties);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should fallback to simulated listings if RentCast API returns 429 or 402', async () => {
      const error429 = new Error('Too Many Requests');
      (error429 as any).response = { status: 429 };
      mockedAxios.get.mockRejectedValueOnce(error429);

      const result = await fetchRentCastListings(40.0150, -105.2705);

      expect(result.properties.length).toBeGreaterThanOrEqual(10);
      expect(result.fallback).toBe(true);
      expect(result.properties[0].id).toContain('sim_');
      expect(result.properties[0].latitude).toBeCloseTo(40.0150, 1);
      expect(result.properties[0].longitude).toBeCloseTo(-105.2705, 1);
    });

    it('should fallback to simulated listings if RENTCAST_API_KEY is missing', async () => {
      // Temporarily clear config key
      const originalKey = config.RENTCAST_API_KEY;
      config.RENTCAST_API_KEY = '';

      const result = await fetchRentCastListings(40.0150, -105.2705);
      expect(result.properties.length).toBeGreaterThanOrEqual(10);
      expect(result.fallback).toBe(true);

      config.RENTCAST_API_KEY = originalKey;
    });
  });

  describe('Overpass Service (OSM Trails)', () => {
    it('should fetch ways from Overpass, parse geom, map difficulties, and cache the result', async () => {
      const mockOverpassResponse = {
        elements: [
          {
            type: 'way',
            id: 11111,
            geometry: [
              { lat: 40.0155, lon: -105.2710 },
              { lat: 40.0165, lon: -105.2720 }
            ],
            tags: {
              name: 'Boulder Creek Path',
              highway: 'cycleway',
              bicycle: 'yes'
            }
          },
          {
            type: 'way',
            id: 22222,
            geometry: [
              { lat: 40.0175, lon: -105.2730 },
              { lat: 40.0185, lon: -105.2740 }
            ],
            tags: {
              name: 'Animas Trail',
              highway: 'path',
              'mtb:scale': '3'
            }
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockOverpassResponse, status: 200 });

      const trails = await fetchOSMTrails(40.0150, -105.2705);

      expect(trails).toHaveLength(2);
      expect(trails[0].id).toBe('way_11111');
      expect(trails[0].name).toBe('Boulder Creek Path');
      expect(trails[0].difficulty).toBe('easy'); // cycleway fallback or custom check
      expect(trails[0].coordinates).toEqual([
        { latitude: 40.0155, longitude: -105.2710 },
        { latitude: 40.0165, longitude: -105.2720 }
      ]);

      expect(trails[1].id).toBe('way_22222');
      expect(trails[1].name).toBe('Animas Trail');
      expect(trails[1].difficulty).toBe('advanced'); // mtb:scale=3 is advanced

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Call again, should use cache
      const secondTrails = await fetchOSMTrails(40.0150, -105.2705);
      expect(secondTrails).toEqual(trails);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should return an empty list and cache it if Overpass returns nothing', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { elements: [] }, status: 200 });

      const trails = await fetchOSMTrails(40.0150, -105.2705);
      expect(trails).toEqual([]);
    });
  });
});

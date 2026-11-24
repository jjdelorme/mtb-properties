import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { geocodeAddress } from '../services/geocodingService';
import { fetchRentCastListings, fetchRentCastProperty } from '../services/rentCastService';
import { fetchOSMTrails } from '../services/overpassService';
import { cacheService } from '../services/cacheService';
import { config } from '../config';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Services & Cache', () => {
  const cacheDir = path.join(__dirname, '../../data/cache');
  const testCacheKeys = [
    `geocode_${Buffer.from('boulder, co').toString('hex')}`,
    `geocode_${Buffer.from('1701 county road 317 (gothic road), crested butte, co 81224').toString('hex')}`,
    'rentcast_40.0150_-105.2700',
    'rentcast_39.7550_-105.2210',
    'rentcast_38.5730_-109.5490',
    'overpass_39.7150_-105.2090',
    'overpass_0.0000_0.0000',
  ];

  const cleanTestCache = () => {
    for (const key of testCacheKeys) {
      const filePath = path.join(cacheDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.debug(`Expected file absence on test teardown: ${filePath}`);
        }
      }
    }
    try {
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        for (const file of files) {
          if (file.startsWith('rentcast_prop_')) {
            fs.unlinkSync(path.join(cacheDir, file));
          }
        }
      }
    } catch (err) {
      console.debug('Expected missing directory or files during teardown');
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    cleanTestCache();
  });

  afterAll(() => {
    cleanTestCache();
  });

  describe('Geocoding Service & Parcel Pinpointing', () => {
    it('should successfully geocode an area address via Nominatim and cache the result', async () => {
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

      mockedAxios.get.mockImplementation(async (url: string) => {
        if (url.includes('nominatim.openstreetmap.org')) {
          return { data: mockGeoResponse, status: 200 };
        }
        throw new Error('Not found');
      });

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
        },
        matchType: 'exact'
      });

      // Verify cached file exists
      const cachedFiles = fs.readdirSync(cacheDir);
      expect(cachedFiles.length).toBeGreaterThan(0);
      expect(cachedFiles.some(f => f.startsWith('geocode_'))).toBe(true);

      // Call again, should use cache and NOT trigger axios
      mockedAxios.get.mockClear();
      const secondResult = await geocodeAddress('Boulder, CO');
      expect(secondResult).toEqual(result);
      expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    });

    it('should pinpoint exact parcel coordinates via RentCast Property Records API', async () => {
      const mockRentCastParcel = [
        {
          id: '1701-County-Rd,-317,-Crested-Butte,-CO-81224',
          formattedAddress: '1701 County Rd, 317, Crested Butte, CO 81224',
          city: 'Crested Butte',
          state: 'CO',
          zipCode: '81224',
          county: 'Gunnison',
          latitude: 38.890993,
          longitude: -106.973486,
          propertyType: 'Land',
          lotSize: 94961
        }
      ];

      mockedAxios.get.mockImplementation(async (url: string) => {
        if (url.includes('api.rentcast.io/v1/properties')) {
          return { data: mockRentCastParcel, status: 200 };
        }
        throw new Error('Not found');
      });

      const result = await geocodeAddress('1701 County Road 317 (Gothic Road), Crested Butte, CO 81224');

      expect(result.lat).toBe(38.890993);
      expect(result.lon).toBe(-106.973486);
      expect(result.matchType).toBe('exact');
      expect(result.propertyDetails?.lotSize).toBe(94961);
      expect(result.propertyDetails?.propertyType).toBe('Land');
    });

    it('should fallback to Nominatim parenthetical alias candidate if RentCast returns 404', async () => {
      const mockAliasResponse = [
        {
          lat: '38.8755',
          lon: '-106.9794',
          display_name: 'Gothic Road, Crested Butte, Gunnison County, Colorado, 81224, United States',
          address: {
            road: 'Gothic Road',
            city: 'Crested Butte',
            state: 'Colorado',
            postcode: '81224',
            country: 'United States',
            country_code: 'us'
          }
        }
      ];

      let nominatimAttempts = 0;
      mockedAxios.get.mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('api.rentcast.io/v1/properties')) {
          const err: any = new Error('No data found');
          err.response = { status: 404 };
          throw err;
        }
        if (url.includes('nominatim.openstreetmap.org')) {
          nominatimAttempts++;
          // First attempt returns empty, second attempt returns valid alias match
          if (nominatimAttempts === 1) {
            return { data: [], status: 200 };
          }
          return { data: mockAliasResponse, status: 200 };
        }
        throw new Error('Unhandled URL');
      });

      const result = await geocodeAddress(' 1701 County Road 317 (Gothic Road), Crested Butte, CO 81224');

      expect(result.lat).toBe(38.8755);
      expect(result.lon).toBe(-106.9794);
      expect(result.matchType).toBe('alias');
    });

    it('should throw an error if no results are found across all services', async () => {
      mockedAxios.get.mockImplementation(async () => {
        return { data: [], status: 200 };
      });

      await expect(geocodeAddress('UnknownPlacexyz')).rejects.toThrow('Location "UnknownPlacexyz" not found.');
    });
  });

  describe('RentCast Service', () => {
    it('should fetch active listings and cache the result', async () => {
      const mockListings = [
        {
          id: 'rentcast_1',
          formattedAddress: '101 Pine St, Boulder, CO 80302',
          price: 950000,
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 2100,
          propertyType: 'Single Family',
          latitude: 40.015,
          longitude: -105.270,
          status: 'Active'
        }
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockListings, status: 200 });

      const result = await fetchRentCastListings(40.015, -105.270, { city: 'Boulder', state: 'Colorado', postcode: '80302' });

      expect(result.fallback).toBe(false);
      expect(result.properties.length).toBe(1);
      expect(result.properties[0].formattedAddress).toBe('101 Pine St, Boulder, CO 80302');
      expect(result.properties[0].price).toBe(950000);

      // Verify cache hit
      mockedAxios.get.mockClear();
      const secondResult = await fetchRentCastListings(40.015, -105.270, { city: 'Boulder', state: 'Colorado', postcode: '80302' });
      expect(secondResult).toEqual(result);
      expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    });

    it('should fallback to simulated listings if RentCast API returns 429 or 402', async () => {
      const errorResponse: any = new Error('Rate limit exceeded');
      errorResponse.response = { status: 429 };
      mockedAxios.get.mockRejectedValueOnce(errorResponse);

      const result = await fetchRentCastListings(39.755, -105.221, { city: 'Golden', state: 'CO', postcode: '80401' });

      expect(result.fallback).toBe(true);
      expect(result.properties.length).toBe(12);
      expect(result.properties[0].formattedAddress).toContain('Golden');
    });

    it('should fallback to simulated listings if RENTCAST_API_KEY is missing', async () => {
      const origKey = config.RENTCAST_API_KEY;
      config.RENTCAST_API_KEY = '';

      const result = await fetchRentCastListings(38.573, -109.549, { city: 'Moab', state: 'UT', postcode: '84532' });

      expect(result.fallback).toBe(true);
      expect(result.properties.length).toBe(12);
      expect(result.properties[0].formattedAddress).toContain('Moab');

      config.RENTCAST_API_KEY = origKey;
    });
  });

  describe('Overpass Service (OSM Trails)', () => {
    it('should fetch ways from Overpass, parse geom, map difficulties, and cache the result', async () => {
      const mockOverpassResponse = {
        elements: [
          {
            type: 'way',
            id: 123456,
            tags: {
              name: 'Apex Trail',
              highway: 'path',
              'mtb:scale': '2'
            },
            geometry: [
              { lat: 39.7150, lon: -105.2090 },
              { lat: 39.7155, lon: -105.2095 }
            ]
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockOverpassResponse, status: 200 });

      const trails = await fetchOSMTrails(39.7150, -105.2090);

      expect(trails.length).toBe(1);
      expect(trails[0].id).toBe('way_123456');
      expect(trails[0].name).toBe('Apex Trail');
      expect(trails[0].difficulty).toBe('intermediate'); // mtb:scale 2 -> intermediate
      expect(trails[0].coordinates.length).toBe(2);

      // Verify cache hit
      mockedAxios.post.mockClear();
      const secondTrails = await fetchOSMTrails(39.7150, -105.2090);
      expect(secondTrails).toEqual(trails);
      expect(mockedAxios.post).toHaveBeenCalledTimes(0);
    });

    it('should return an empty list and cache it if Overpass returns nothing', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { elements: [] }, status: 200 });

      const trails = await fetchOSMTrails(0.0, 0.0);
      expect(trails).toEqual([]);
    });

    it('should parse relations and extract member ways, avoiding duplicates and ignoring geometry-less members', async () => {
      const mockOverpassResponse = {
        elements: [
          {
            type: 'way',
            id: 101,
            tags: { name: 'Standalone Name', 'mtb:scale': '3' },
            geometry: [ { lat: 39.7150, lon: -105.2090 }, { lat: 39.7151, lon: -105.2091 } ]
          },
          {
            type: 'relation',
            id: 201,
            tags: { route: 'mtb', name: 'Relation Route', 'mtb:scale': '1' },
            members: [
              {
                type: 'way',
                ref: 101,
                role: '',
                geometry: [ { lat: 39.7150, lon: -105.2090 }, { lat: 39.7151, lon: -105.2091 } ]
              },
              {
                type: 'way',
                ref: 102,
                role: '',
                geometry: [ { lat: 39.7152, lon: -105.2092 }, { lat: 39.7153, lon: -105.2093 } ]
              },
              {
                type: 'way',
                ref: 103,
                role: ''
              }
            ]
          }
        ]
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockOverpassResponse, status: 200 });

      const trails = await fetchOSMTrails(39.7150, -105.2090);

      expect(trails.length).toBe(2);
      
      const way101 = trails.find(t => t.id === 'way_101');
      expect(way101).toBeDefined();
      expect(way101?.name).toBe('Standalone Name');
      expect(way101?.difficulty).toBe('advanced');

      const way102 = trails.find(t => t.id === 'way_102');
      expect(way102).toBeDefined();
      expect(way102?.name).toBe('Relation Route');
      expect(way102?.difficulty).toBe('intermediate');
    });
  });
});

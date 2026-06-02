import request from 'supertest';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from '../index';
import { cacheService } from '../services/cacheService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Server Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheService.clear();
  });

  afterAll(() => {
    cacheService.clear();
  });

  describe('GET /api/search', () => {
    it('should return 400 if q parameter is missing', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Search query 'q' is required." });
    });

    it('should return 400 if q parameter is empty', async () => {
      const res = await request(app).get('/api/search?q=%20');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Search query 'q' is required." });
    });

    it('should return 200 and sandbox data for Golden ZIP (80401) without calling axios', async () => {
      const res = await request(app).get('/api/search?q=80401');
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('sandbox');
      expect(res.body.normalizedLocation).toBe('Golden, Colorado, USA');
      expect(res.body.properties.length).toBeGreaterThan(0);
      expect(res.body.trails.length).toBeGreaterThan(0);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should return 200 and live data for a valid non-sandbox location', async () => {
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

      const mockRentCastResponse = [
        {
          id: 'boulder_prop_1',
          formattedAddress: '999 Foothills Dr, Boulder, CO 80302',
          price: 950000,
          bedrooms: 3,
          bathrooms: 2,
          squareFootage: 2000,
          propertyType: 'Single Family',
          latitude: 40.0160,
          longitude: -105.2710
        }
      ];

      const mockOverpassResponse = {
        elements: [
          {
            type: 'way',
            id: 99999,
            geometry: [
              { lat: 40.0155, lon: -105.2708 },
              { lat: 40.0165, lon: -105.2712 }
            ],
            tags: {
              name: 'Boulder Valley Trail',
              highway: 'path',
              'mtb:scale': '2'
            }
          }
        ]
      };

      // Mock Nominatim (first GET call)
      mockedAxios.get.mockResolvedValueOnce({ data: mockGeoResponse, status: 200 });
      // Mock RentCast (second GET call in parallel with Overpass)
      mockedAxios.get.mockResolvedValueOnce({ data: mockRentCastResponse, status: 200 });
      // Mock Overpass (POST call in parallel)
      mockedAxios.post.mockResolvedValueOnce({ data: mockOverpassResponse, status: 200 });

      const res = await request(app).get('/api/search?q=Boulder');
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('live');
      expect(res.body.normalizedLocation).toBe('Boulder, Colorado, USA');
      expect(res.body.properties).toHaveLength(1);
      expect(res.body.properties[0].id).toBe('boulder_prop_1');
      expect(res.body.properties[0].nearestTrail).toBeDefined();
      expect(res.body.properties[0].nearestTrail?.name).toBe('Boulder Valley Trail');
      expect(res.body.trails).toHaveLength(1);

      // Verify cached search data exists
      // Calling it again should trigger cache hit, returning source: 'cache', and zero additional axios calls!
      const resCached = await request(app).get('/api/search?q=Boulder');
      expect(resCached.status).toBe(200);
      expect(resCached.body.source).toBe('cache');
      expect(resCached.body.normalizedLocation).toBe('Boulder, Colorado, USA');
      expect(resCached.body.properties).toHaveLength(1);
    });

    it('should return 404 if geocoding fails', async () => {
      // Mock Nominatim returning empty results
      mockedAxios.get.mockResolvedValueOnce({ data: [], status: 200 });

      const res = await request(app).get('/api/search?q=NonExistentPlaceXYZ');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });
});

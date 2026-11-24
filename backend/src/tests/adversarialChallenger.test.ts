import request from 'supertest';
import axios from 'axios';
import { app } from '../index';
import { parseAddress, generateGeocodeCandidates } from '../services/addressParser';
import { geocodeAddress } from '../services/geocodingService';
import { fetchOSMTrails } from '../services/overpassService';
import { haversineDistanceMiles } from '../services/proximityService';
import * as rentCastService from '../services/rentCastService';

describe('Adversarial Challenger Stress Suite (Milestone M4 Iteration 2)', () => {
  jest.setTimeout(60000);

  beforeEach(() => {
    // Strictly mock RentCast real estate listings & parcel calls
    // to guarantee zero live calls consume paid RentCast API credits
    jest.spyOn(rentCastService, 'fetchRentCastListings').mockResolvedValue({
      properties: [],
      fallback: true
    });
    jest.spyOn(rentCastService, 'fetchRentCastProperty').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Adversarial Address Parsing & Unit Edge Cases', () => {
    const unitTestCases = [
      {
        input: '400 Forest Service Rd #550, Almont, CO 81210',
        expectedHouse: '400',
        expectedUnit: '#550',
        expectedCity: 'Almont',
        expectedState: 'CO',
        expectedZip: '81210'
      },
      {
        input: '678 Pine St, Buena Vista, CO 81211',
        expectedHouse: '678',
        expectedUnit: undefined,
        expectedCity: 'Buena Vista',
        expectedState: 'CO',
        expectedZip: '81211'
      },
      {
        input: '158 Camp Rd, East Burke, VT 05832',
        expectedHouse: '158',
        expectedUnit: undefined,
        expectedCity: 'East Burke',
        expectedState: 'VT',
        expectedZip: '05832'
      },
      {
        input: '100 Main St Suite 200, Denver, CO 80202',
        expectedHouse: '100',
        expectedUnit: 'Suite 200',
        expectedCity: 'Denver',
        expectedState: 'CO',
        expectedZip: '80202'
      },
      {
        input: '500 Elm St Unit #3, Boulder, CO 80302',
        expectedHouse: '500',
        expectedUnit: 'Unit #3',
        expectedCity: 'Boulder',
        expectedState: 'CO',
        expectedZip: '80302'
      },
      {
        input: '123 Oak Ave Apt 12B, Crested Butte, CO 81224',
        expectedHouse: '123',
        expectedUnit: 'Apt 12B',
        expectedCity: 'Crested Butte',
        expectedState: 'CO',
        expectedZip: '81224'
      },
      {
        input: '789 Pine Rd Bldg 4, Salida, CO 81201',
        expectedHouse: '789',
        expectedUnit: 'Bldg 4',
        expectedCity: 'Salida',
        expectedState: 'CO',
        expectedZip: '81201'
      },
      {
        input: '45 Mountain Way Floor 2, Vail, CO 81657',
        expectedHouse: '45',
        expectedUnit: 'Floor 2',
        expectedCity: 'Vail',
        expectedState: 'CO',
        expectedZip: '81657'
      },
      {
        input: '88 Trail View Lot 14, Frisco, CO 80443',
        expectedHouse: '88',
        expectedUnit: 'Lot 14',
        expectedCity: 'Frisco',
        expectedState: 'CO',
        expectedZip: '80443'
      },
      {
        input: '99 Forest Ln Cabin 7, Steamboat Springs, CO 80487',
        expectedHouse: '99',
        expectedUnit: 'Cabin 7',
        expectedCity: 'Steamboat Springs',
        expectedState: 'CO',
        expectedZip: '80487'
      }
    ];

    for (const tc of unitTestCases) {
      it(`should correctly parse components for "${tc.input}"`, () => {
        const parsed = parseAddress(tc.input);
        expect(parsed.houseNumber).toBe(tc.expectedHouse);
        expect(parsed.unit).toBe(tc.expectedUnit);
        expect(parsed.city).toBe(tc.expectedCity);
        expect(parsed.state).toBe(tc.expectedState);
        expect(parsed.postalcode).toBe(tc.expectedZip);
      });

      it(`should generate clean unit-stripped and structured candidates for "${tc.input}" without orphaned punctuation`, () => {
        const candidates = generateGeocodeCandidates(tc.input);
        expect(candidates.length).toBeGreaterThan(0);

        for (const candidate of candidates) {
          if (candidate.query) {
            // Should never contain trailing '#' or duplicate commas
            expect(candidate.query).not.toMatch(/#\s*$/);
            expect(candidate.query).not.toMatch(/,\s*,/);
            expect(candidate.query).not.toMatch(/^,/);
          }
          if (candidate.structured) {
            if (candidate.structured.street) {
              expect(candidate.structured.street).not.toContain('#');
            }
          }
        }
      });
    }
  });

  describe('2. RentCast Active Network Firewall Verification', () => {
    it('should block GET requests to api.rentcast.io', async () => {
      await expect(axios.get('https://api.rentcast.io/v1/properties/search'))
        .rejects
        .toThrow(/CRITICAL INTEGRITY VIOLATION: Live RentCast API call blocked in test environment/);
    });

    it('should block POST requests to api.rentcast.io', async () => {
      await expect(axios.post('https://api.rentcast.io/v1/avm/value', { address: 'test' }))
        .rejects
        .toThrow(/CRITICAL INTEGRITY VIOLATION: Live RentCast API call blocked in test environment/);
    });

    it('should block arbitrary axios request configs targeting api.rentcast.io', async () => {
      await expect(axios.request({ url: 'https://api.rentcast.io/v1/listings/sale' }))
        .rejects
        .toThrow(/CRITICAL INTEGRITY VIOLATION: Live RentCast API call blocked in test environment/);
    });
  });

  describe('3. Non-Regression Area Searches', () => {
    it('should resolve Breckenridge, CO with area center, listings, and trails', async () => {
      const res = await request(app).get('/api/search?q=Breckenridge,%20CO');
      expect(res.status).toBe(200);
      expect(res.body.normalizedLocation).toBeDefined();
      expect(res.body.normalizedLocation.toLowerCase()).toContain('breckenridge');
      expect(res.body.customAddress).toBeUndefined();
      expect(res.body.center).toBeDefined();
      expect(res.body.center.latitude).toBeGreaterThan(39.0);
      expect(res.body.center.longitude).toBeLessThan(-105.0);
      expect(Array.isArray(res.body.properties)).toBe(true);
      expect(Array.isArray(res.body.trails)).toBe(true);
      expect(res.body.trails.length).toBeGreaterThan(0);
      expect(res.body.trails.some((t: any) => t.id.includes('sim_trail'))).toBe(false);
    });

    it('should resolve ZIP 81210 (Almont area) with area center, listings, and trails', async () => {
      const res = await request(app).get('/api/search?q=81210');
      expect(res.status).toBe(200);
      expect(res.body.normalizedLocation).toBeDefined();
      expect(res.body.customAddress).toBeUndefined();
      expect(res.body.center).toBeDefined();
      expect(Array.isArray(res.body.properties)).toBe(true);
      expect(Array.isArray(res.body.trails)).toBe(true);
      expect(res.body.trails.length).toBeGreaterThan(0);
      expect(res.body.trails.some((t: any) => t.id.includes('sim_trail'))).toBe(false);
    });

    it('should resolve East Burke, VT with area center, listings, and trails', async () => {
      const res = await request(app).get('/api/search?q=East%20Burke,%20VT');
      expect(res.status).toBe(200);
      expect(res.body.normalizedLocation).toBeDefined();
      expect(res.body.normalizedLocation.toLowerCase()).toMatch(/burke|caledonia/);
      expect(res.body.customAddress).toBeUndefined();
      expect(res.body.center).toBeDefined();
      expect(Array.isArray(res.body.properties)).toBe(true);
      expect(Array.isArray(res.body.trails)).toBe(true);
      expect(res.body.trails.length).toBeGreaterThan(0);
      expect(res.body.trails.some((t: any) => t.id.includes('sim_trail'))).toBe(false);
    });
  });

  describe('4. Trail Proximity & Ground-Truth Verification for Reference Addresses', () => {
    it('Reference 1 (Almont): genuine physical trails, distance <= 8 mi, zero synthetic', async () => {
      const addr = '400 Forest Service Rd #550, Almont, CO 81210';
      const geo = await geocodeAddress(addr);
      expect(geo).toBeDefined();
      expect(geo.lat).toBeGreaterThanOrEqual(38.60);
      expect(geo.lat).toBeLessThanOrEqual(38.75);

      const trails = await fetchOSMTrails(geo.lat, geo.lon, 8);
      expect(trails.length).toBeGreaterThan(0);

      // Verify zero synthetic trails
      for (const trail of trails) {
        expect(trail.id).not.toContain('sim_trail');
        expect(trail.name.toLowerCase()).not.toBe('lower loop singletrack');
      }

      // Check distance bounds
      let minDistance = Infinity;
      for (const trail of trails) {
        for (const pt of trail.coordinates) {
          const d = haversineDistanceMiles(geo.lat, geo.lon, pt.latitude, pt.longitude);
          if (d < minDistance) minDistance = d;
        }
      }
      expect(minDistance).toBeLessThanOrEqual(8.0);
    });

    it('Reference 2 (Buena Vista): genuine physical trails, distance < 0.5 mi, zero synthetic', async () => {
      const addr = '678 Pine St, Buena Vista, CO 81211';
      const geo = await geocodeAddress(addr);
      expect(geo).toBeDefined();

      const trails = await fetchOSMTrails(geo.lat, geo.lon, 8);
      expect(trails.length).toBeGreaterThan(0);

      // Verify zero synthetic trails
      for (const trail of trails) {
        expect(trail.id).not.toContain('sim_trail');
        expect(trail.name.toLowerCase()).not.toBe('lower loop singletrack');
      }

      // Check specific Whipple / Arkansas River trails < 0.5 miles
      const bvTrails = trails.filter(t => /whipple|arkansas river|bridge to bridge/i.test(t.name));
      expect(bvTrails.length).toBeGreaterThan(0);

      let minDistance = Infinity;
      for (const trail of bvTrails) {
        for (const pt of trail.coordinates) {
          const d = haversineDistanceMiles(geo.lat, geo.lon, pt.latitude, pt.longitude);
          if (d < minDistance) minDistance = d;
        }
      }
      expect(minDistance).toBeLessThan(0.5);
    });

    it('Reference 3 (East Burke): genuine Kingdom Trails, distance < 0.3 mi, zero synthetic', async () => {
      const addr = '158 Camp Rd, East Burke, VT 05832';
      const geo = await geocodeAddress(addr);
      expect(geo).toBeDefined();

      const trails = await fetchOSMTrails(geo.lat, geo.lon, 8);
      expect(trails.length).toBeGreaterThan(0);

      // Verify zero synthetic trails
      for (const trail of trails) {
        expect(trail.id).not.toContain('sim_trail');
        expect(trail.name.toLowerCase()).not.toBe('lower loop singletrack');
      }

      // Check Kingdom Trails (Swamp Donkey / BFR / Besaw) < 0.3 miles
      const ktTrails = trails.filter(t => /swamp donkey|bfr|besaw|kitchel/i.test(t.name));
      expect(ktTrails.length).toBeGreaterThan(0);

      let minDistance = Infinity;
      for (const trail of ktTrails) {
        for (const pt of trail.coordinates) {
          const d = haversineDistanceMiles(geo.lat, geo.lon, pt.latitude, pt.longitude);
          if (d < minDistance) minDistance = d;
        }
      }
      expect(minDistance).toBeLessThan(0.3);
    });
  });
});

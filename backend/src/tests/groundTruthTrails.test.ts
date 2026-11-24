import request from 'supertest';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { app } from '../index';
import { geocodeAddress } from '../services/geocodingService';
import { fetchOSMTrails } from '../services/overpassService';
import { haversineDistanceMiles } from '../services/proximityService';
import * as rentCastService from '../services/rentCastService';

describe('Ground-Truth Trail Research & Verification (Real OSM Trails)', () => {
  // Set extended timeout for live geocoding & OSM queries
  jest.setTimeout(45000);

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

  describe('RentCast Active Network Firewall', () => {
    it('should actively block any outgoing call to api.rentcast.io and throw critical integrity violation', async () => {
      await expect(axios.get('https://api.rentcast.io/v1/properties?address=test'))
        .rejects
        .toThrow(/CRITICAL INTEGRITY VIOLATION: Live RentCast API call blocked in test environment/);
    });
  });

  describe('Reference Address 1: 400 Forest Service Rd #550, Almont, CO 81210', () => {
    const address = '400 Forest Service Rd #550, Almont, CO 81210';

    it('should unmocked geocode to Almont area and discover real nearby trails within 8 miles', async () => {
      // 1. Unmocked geocoding
      const geo = await geocodeAddress(address);
      expect(geo).toBeDefined();
      expect(geo.lat).toBeGreaterThanOrEqual(38.60);
      expect(geo.lat).toBeLessThanOrEqual(38.75);
      expect(geo.lon).toBeGreaterThanOrEqual(-106.92);
      expect(geo.lon).toBeLessThanOrEqual(-106.75);
      expect(geo.display_name.toLowerCase()).toContain('almont');

      // 2. Unmocked trail search
      const trails = await fetchOSMTrails(geo.lat, geo.lon, 8);
      expect(trails).toBeDefined();
      expect(trails.length).toBeGreaterThan(15);

      // 3. Assert zero synthetic trails
      const hasSynthetic = trails.some(t =>
        t.id.includes('sim_trail') ||
        t.name.toLowerCase().includes('lower loop singletrack')
      );
      expect(hasSynthetic).toBe(false);

      // 4. Assert presence of real Almont / Taylor Park / Doctor Park trails within 8 miles
      const realTrailTargets = ['Harmel', 'Ridge', 'Doctor Park', 'Pine Creek', 'Contour', 'Three Mile Creek'];
      const matchingTrails = trails.filter(t =>
        realTrailTargets.some(target => t.name.toLowerCase().includes(target.toLowerCase()))
      );
      expect(matchingTrails.length).toBeGreaterThan(0);

      // 5. Geodesic distance verification
      // Calculate minimum distance from the geocoded address to any node on the matching trails
      let foundTrailWithin8Miles = false;
      for (const trail of matchingTrails) {
        for (const pt of trail.coordinates) {
          const dist = haversineDistanceMiles(geo.lat, geo.lon, pt.latitude, pt.longitude);
          if (dist <= 8.0) {
            foundTrailWithin8Miles = true;
            // Verify reasonable geodesic tolerance for Almont trails (e.g. Harmel ~5.5 mi, Pine Creek ~4.9 mi, Doctor Park ~6.6 mi)
            expect(dist).toBeGreaterThanOrEqual(1.0);
            expect(dist).toBeLessThanOrEqual(8.0);
            break;
          }
        }
        if (foundTrailWithin8Miles) break;
      }
      expect(foundTrailWithin8Miles).toBe(true);
    });
  });

  describe('Reference Address 2: 678 Pine St, Buena Vista, CO 81211', () => {
    const address = '678 Pine St, Buena Vista, CO 81211';

    it('should unmocked geocode to Buena Vista and discover Whipple / Arkansas River trails < 0.5 miles', async () => {
      // 1. Unmocked geocoding
      const geo = await geocodeAddress(address);
      expect(geo).toBeDefined();
      expect(geo.lat).toBeGreaterThanOrEqual(38.83);
      expect(geo.lat).toBeLessThanOrEqual(38.86);
      expect(geo.lon).toBeGreaterThanOrEqual(-106.14);
      expect(geo.lon).toBeLessThanOrEqual(-106.11);
      expect(geo.display_name.toLowerCase()).toContain('buena vista');

      // 2. Unmocked trail search
      const trails = await fetchOSMTrails(geo.lat, geo.lon, 8);
      expect(trails).toBeDefined();
      expect(trails.length).toBeGreaterThan(20);

      // 3. Assert zero synthetic trails
      const hasSynthetic = trails.some(t =>
        t.id.includes('sim_trail') ||
        t.name.toLowerCase().includes('lower loop singletrack')
      );
      expect(hasSynthetic).toBe(false);

      // 4. Assert presence of real Buena Vista trails
      const bvTargets = ['Whipple', 'Arkansas River', 'Bridge to Bridge', 'Zebulon Pike'];
      const matchingTrails = trails.filter(t =>
        bvTargets.some(target => t.name.toLowerCase().includes(target.toLowerCase()))
      );
      expect(matchingTrails.length).toBeGreaterThan(0);

      // 5. Geodesic distance assertion: distance < 0.5 miles
      let minDistance = Infinity;
      let closestTrailName = '';
      for (const trail of matchingTrails) {
        for (const pt of trail.coordinates) {
          const dist = haversineDistanceMiles(geo.lat, geo.lon, pt.latitude, pt.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestTrailName = trail.name;
          }
        }
      }
      expect(minDistance).toBeLessThan(0.5);
      expect(closestTrailName.length).toBeGreaterThan(0);
    });

    it('should return 200 and customAddress with nearestTrail < 0.5 miles via GET /api/search', async () => {
      const res = await request(app).get(`/api/search?q=${encodeURIComponent(address)}&type=address`);
      expect(res.status).toBe(200);
      expect(res.body.customAddress).toBeDefined();
      expect(res.body.customAddress.nearestTrail).toBeDefined();
      expect(res.body.customAddress.nearestTrail.distanceMiles).toBeLessThan(0.5);
      expect(res.body.trails.length).toBeGreaterThan(0);
      expect(res.body.trails.some((t: any) => t.id.includes('sim_trail'))).toBe(false);
    });
  });

  describe('Reference Address 3: 158 Camp Rd, East Burke, VT 05832', () => {
    const address = '158 Camp Rd, East Burke, VT 05832';

    it('should unmocked geocode to Camp Road / Burke and discover Kingdom Trails (Swamp Donkey / BFR / Besaw) < 0.3 miles', async () => {
      // 1. Unmocked geocoding
      const geo = await geocodeAddress(address);
      expect(geo).toBeDefined();
      expect(geo.lat).toBeGreaterThanOrEqual(44.60);
      expect(geo.lat).toBeLessThanOrEqual(44.64);
      expect(geo.lon).toBeGreaterThanOrEqual(-71.90);
      expect(geo.lon).toBeLessThanOrEqual(-71.86);
      expect(geo.display_name.toLowerCase()).toMatch(/burke|camp road/);

      // 2. Unmocked trail search
      const trails = await fetchOSMTrails(geo.lat, geo.lon, 8);
      expect(trails).toBeDefined();
      expect(trails.length).toBeGreaterThan(20);

      // 3. Assert zero synthetic trails
      const hasSynthetic = trails.some(t =>
        t.id.includes('sim_trail') ||
        t.name.toLowerCase().includes('lower loop singletrack')
      );
      expect(hasSynthetic).toBe(false);

      // 4. Assert presence of real Kingdom Trails (Swamp Donkey, BFR, Besaw, Kitchel)
      const kingdomTargets = ['Swamp Donkey', 'BFR', 'Besaw', 'Kitchel'];
      const matchingTrails = trails.filter(t =>
        kingdomTargets.some(target => t.name.toLowerCase().includes(target.toLowerCase()))
      );
      expect(matchingTrails.length).toBeGreaterThan(0);

      // 5. Geodesic distance assertion: distance < 0.3 miles (immediate backyard proximity)
      let minDistance = Infinity;
      let closestTrailName = '';
      for (const trail of matchingTrails) {
        for (const pt of trail.coordinates) {
          const dist = haversineDistanceMiles(geo.lat, geo.lon, pt.latitude, pt.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            closestTrailName = trail.name;
          }
        }
      }
      expect(minDistance).toBeLessThan(0.3);
      expect(closestTrailName.length).toBeGreaterThan(0);
    });

    it('should return 200 and customAddress with nearestTrail < 0.3 miles via GET /api/search', async () => {
      const res = await request(app).get(`/api/search?q=${encodeURIComponent(address)}&type=address`);
      expect(res.status).toBe(200);
      expect(res.body.customAddress).toBeDefined();
      expect(res.body.customAddress.nearestTrail).toBeDefined();
      expect(res.body.customAddress.nearestTrail.distanceMiles).toBeLessThan(0.3);
      expect(res.body.trails.length).toBeGreaterThan(0);
      expect(res.body.trails.some((t: any) => t.id.includes('sim_trail'))).toBe(false);
    });
  });

  describe('Anti-Hardcoding Automated Verification', () => {
    it('should scan all non-test source files in backend/src/ and frontend/src/ and assert 0 occurrences of reference addresses', () => {
      const referenceAddresses = [
        '400 Forest Service Rd #550',
        '678 Pine St',
        '158 Camp Rd'
      ];

      const scanDirectories = [
        path.join(__dirname, '..'), // backend/src
        path.join(__dirname, '../../../frontend/src') // frontend/src
      ];

      function getAllFiles(dir: string, fileList: string[] = []): string[] {
        if (!fs.existsSync(dir)) return fileList;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'tests') {
              getAllFiles(fullPath, fileList);
            }
          } else {
            // Exclude test files, setup files, and test fixtures
            const isTest = entry.name.includes('.test.') || entry.name.includes('.spec.') || entry.name === 'setup.ts';
            if (!isTest && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
              fileList.push(fullPath);
            }
          }
        }
        return fileList;
      }

      const allSourceFiles: string[] = [];
      for (const scanDir of scanDirectories) {
        getAllFiles(scanDir, allSourceFiles);
      }

      expect(allSourceFiles.length).toBeGreaterThan(5);

      const violations: { file: string; address: string; line: number }[] = [];

      for (const filePath of allSourceFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          for (const addr of referenceAddresses) {
            if (line.toLowerCase().includes(addr.toLowerCase())) {
              violations.push({
                file: path.relative(path.join(__dirname, '../../..'), filePath),
                address: addr,
                line: lineIdx + 1
              });
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });
});

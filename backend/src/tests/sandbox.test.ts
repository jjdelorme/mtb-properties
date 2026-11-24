import { geocodeAddress } from '../services/geocodingService';
import { cacheService } from '../services/cacheService';
import fs from 'fs';
import path from 'path';

describe('Preloaded Cache and Offline Geocoding System', () => {
  describe('Offline Geocoding Shortcuts', () => {
    it('should return Golden coordinates for Golden queries', async () => {
      const res = await geocodeAddress('80401');
      expect(res.lat).toBe(39.7555);
      expect(res.lon).toBe(-105.2211);
      expect(res.display_name).toContain('Golden');
    });

    it('should return Moab coordinates for Moab queries', async () => {
      const res = await geocodeAddress('moab');
      expect(res.lat).toBe(38.5733);
      expect(res.lon).toBe(-109.5498);
      expect(res.display_name).toContain('Moab');
    });

    it('should return Bellingham coordinates for Bellingham queries', async () => {
      const res = await geocodeAddress('bellingham, wa');
      expect(res.lat).toBe(48.7519);
      expect(res.lon).toBe(-122.4787);
      expect(res.display_name).toContain('Bellingham');
    });
  });

  describe('Preloaded Cache Fallbacks', () => {
    const key = 'rentcast_39.7555_-105.2211';
    
    afterEach(() => {
      try {
        const cacheFilePath = path.join(__dirname, '../../data/cache', `${key}.json`);
        if (fs.existsSync(cacheFilePath)) {
          fs.unlinkSync(cacheFilePath);
        }
      } catch (e) {
        console.debug('Failed to clean up cache file in tests:', e);
      }
    });

    it('should fall back to preloaded properties and trails in cacheService', () => {
      // Clear cache directory first if needed, but get should serve from preloaded either way
      const goldenRentCast = cacheService.get<any>(key);
      expect(goldenRentCast).not.toBeNull();
      expect(goldenRentCast.properties).toBeDefined();
      expect(goldenRentCast.properties.length).toBeGreaterThan(0);
    });

    it('should fall back to preloaded data if cache file is expired', () => {
      cacheService.set(key, { fallback: true, properties: [{ id: 'sim_123' }] }, -10000); 

      const goldenRentCast = cacheService.get<any>(key);
      expect(goldenRentCast).not.toBeNull();
      expect(goldenRentCast.fallback).toBe(false);
      expect(goldenRentCast.properties.length).toBeGreaterThan(0);
      expect(goldenRentCast.properties[0].id).not.toMatch(/^sim_/);
    });

    it('should fall back to preloaded data if cache file is unexpired but has fallback: true', () => {
      cacheService.set(key, { fallback: true, properties: [{ id: 'sim_123' }] }, 10000);

      const goldenRentCast = cacheService.get<any>(key);
      expect(goldenRentCast).not.toBeNull();
      expect(goldenRentCast.fallback).toBe(false);
      expect(goldenRentCast.properties.length).toBeGreaterThan(0);
      expect(goldenRentCast.properties[0].id).not.toMatch(/^sim_/);
    });
  });
});

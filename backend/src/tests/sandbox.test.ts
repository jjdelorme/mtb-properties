import { geocodeAddress } from '../services/geocodingService';
import { cacheService } from '../services/cacheService';

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
    it('should fall back to preloaded properties and trails in cacheService', () => {
      // Clear cache directory first if needed, but get should serve from preloaded either way
      const goldenRentCast = cacheService.get<any>('rentcast_39.7555_-105.2211');
      expect(goldenRentCast).not.toBeNull();
      expect(goldenRentCast.properties).toBeDefined();
      expect(goldenRentCast.properties.length).toBeGreaterThan(0);
    });
  });
});

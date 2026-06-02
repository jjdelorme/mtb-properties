import { isSandboxQuery, getSandboxData, getSandboxConfig } from '../services/mockDataService';

describe('Sandbox Mock Data Engine', () => {
  describe('isSandboxQuery', () => {
    it('should return true for sandbox ZIP codes', () => {
      expect(isSandboxQuery('80401')).toBe(true);
      expect(isSandboxQuery('84532')).toBe(true);
      expect(isSandboxQuery('98225')).toBe(true);
    });

    it('should return true for sandbox city names case-insensitively', () => {
      expect(isSandboxQuery('Golden')).toBe(true);
      expect(isSandboxQuery('moab')).toBe(true);
      expect(isSandboxQuery('Bellingham, WA')).toBe(true);
    });

    it('should return false for non-sandbox queries', () => {
      expect(isSandboxQuery('90210')).toBe(false);
      expect(isSandboxQuery('Denver')).toBe(false);
      expect(isSandboxQuery('')).toBe(false);
    });
  });

  describe('getSandboxConfig', () => {
    it('should return the correct configuration for Golden', () => {
      const config = getSandboxConfig('80401');
      expect(config).not.toBeNull();
      expect(config?.normalized).toBe('Golden, Colorado, USA');
      expect(config?.center).toEqual({ latitude: 39.7555, longitude: -105.2211 });
    });

    it('should return the correct configuration for Moab', () => {
      const config = getSandboxConfig('Moab, UT');
      expect(config).not.toBeNull();
      expect(config?.normalized).toBe('Moab, Utah, USA');
    });

    it('should return the correct configuration for Bellingham', () => {
      const config = getSandboxConfig('Bellingham');
      expect(config).not.toBeNull();
      expect(config?.normalized).toBe('Bellingham, Washington, USA');
    });
  });

  describe('getSandboxData', () => {
    it('should load properties and trails, calculating proximity on the fly', () => {
      const response = getSandboxData('80401');
      
      expect(response.searchQuery).toBe('80401');
      expect(response.normalizedLocation).toBe('Golden, Colorado, USA');
      expect(response.source).toBe('sandbox');
      expect(response.properties.length).toBeGreaterThan(0);
      expect(response.trails.length).toBeGreaterThan(0);

      // Verify property fields
      const property = response.properties[0];
      expect(property.id).toBeDefined();
      expect(property.formattedAddress).toContain('CO 80401');
      expect(property.price).toBeGreaterThan(0);
      expect(property.latitude).toBeDefined();
      expect(property.longitude).toBeDefined();

      // Verify proximity calculated
      expect(property.nearestTrail).toBeDefined();
      expect(property.nearestTrail?.name).toBeDefined();
      expect(property.nearestTrail?.distanceMiles).toBeGreaterThanOrEqual(0);

      // Verify sorting is ascending by distanceMiles
      for (let i = 0; i < response.properties.length - 1; i++) {
        const distA = response.properties[i].nearestTrail?.distanceMiles ?? Infinity;
        const distB = response.properties[i + 1].nearestTrail?.distanceMiles ?? Infinity;
        expect(distA).toBeLessThanOrEqual(distB);
      }
    });

    it('should throw an error for non-sandbox queries', () => {
      expect(() => getSandboxData('90210')).toThrow();
    });
  });
});

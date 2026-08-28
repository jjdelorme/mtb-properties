import { parseAddress, generateGeocodeCandidates } from '../services/addressParser';

describe('Address Parser Service', () => {
  describe('parseAddress', () => {
    it('should parse address with parenthetical road alias', () => {
      const parsed = parseAddress(' 1701 County Road 317 (Gothic Road), Crested Butte, CO 81224');
      expect(parsed.houseNumber).toBe('1701');
      expect(parsed.aliases).toContain('Gothic Road');
      expect(parsed.state).toBe('CO');
      expect(parsed.postalcode).toBe('81224');
      expect(parsed.city).toBe('Crested Butte');
    });

    it('should parse address with unit/apartment number', () => {
      const parsed = parseAddress('1000 Lookout Mountain Rd, Apt 4B, Golden, Colorado 80401');
      expect(parsed.houseNumber).toBe('1000');
      expect(parsed.unit).toBe('Apt 4B');
      expect(parsed.state).toBe('CO');
      expect(parsed.postalcode).toBe('80401');
    });

    it('should parse address with highway designation', () => {
      const parsed = parseAddress('500 US-550 (Million Dollar Hwy), Ouray, CO');
      expect(parsed.houseNumber).toBe('500');
      expect(parsed.aliases).toContain('Million Dollar Hwy');
      expect(parsed.state).toBe('CO');
    });
  });

  describe('generateGeocodeCandidates', () => {
    it('should generate alias candidate for parenthetical road query', () => {
      const candidates = generateGeocodeCandidates('1701 County Road 317 (Gothic Road), Crested Butte, CO 81224');
      const queries = candidates.map(c => c.query).filter(Boolean);

      // Should have alias replacement
      expect(queries.some(q => q?.includes('1701 Gothic Road'))).toBe(true);
      // Should have stripped parens version
      expect(queries.some(q => q?.includes('1701 County Road 317'))).toBe(true);
      // Should have CR road variant
      expect(queries.some(q => q?.includes('1701 CR 317') || q?.includes('1701 Co Rd 317'))).toBe(true);
      // Should have street fallback
      expect(queries.some(q => q?.includes('Gothic Road') || q?.includes('County Road 317'))).toBe(true);
    });

    it('should generate unit stripped candidate', () => {
      const candidates = generateGeocodeCandidates('1000 Lookout Mountain Rd, Apt 4B, Golden, CO 80401');
      const queries = candidates.map(c => c.query).filter(Boolean);

      expect(queries.some(q => q?.includes('1000 Lookout Mountain Rd, Golden, CO 80401'))).toBe(true);
    });

    it('should generate structured candidates', () => {
      const candidates = generateGeocodeCandidates('1701 County Road 317 (Gothic Road), Crested Butte, CO 81224');
      const structured = candidates.map(c => c.structured).filter(Boolean);

      expect(structured.length).toBeGreaterThan(0);
      expect(structured.some(s => s?.city === 'Crested Butte' && s?.state === 'CO')).toBe(true);
    });
  });
});

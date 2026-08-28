import { describe, it, expect } from 'vitest';
import {
  calculateTrailLengthMiles,
  formatTrailLength,
  getDifficultyColor,
  getDifficultyBadge,
  haversineDistanceMiles,
} from '../utils/trailUtils';

describe('trailUtils Utility Functions', () => {
  describe('haversineDistanceMiles', () => {
    it('calculates distance between two known coordinates accurately', () => {
      // Golden, CO to Boulder, CO (~18 miles)
      const dist = haversineDistanceMiles(39.7555, -105.2211, 40.0150, -105.2705);
      expect(dist).toBeGreaterThan(17);
      expect(dist).toBeLessThan(19);
    });

    it('returns 0 for identical coordinates', () => {
      expect(haversineDistanceMiles(39.7555, -105.2211, 39.7555, -105.2211)).toBe(0);
    });
  });

  describe('calculateTrailLengthMiles', () => {
    it('calculates 0 for empty or single point coordinates', () => {
      expect(calculateTrailLengthMiles([])).toBe(0);
      expect(calculateTrailLengthMiles([{ latitude: 39.7161, longitude: -105.2301 }])).toBe(0);
    });

    it('sums distances across multiple coordinate points', () => {
      const coords = [
        { latitude: 39.7161, longitude: -105.2301 },
        { latitude: 39.7170, longitude: -105.2350 },
        { latitude: 39.7185, longitude: -105.2410 },
      ];
      const length = calculateTrailLengthMiles(coords);
      expect(length).toBeGreaterThan(0.5);
      expect(length).toBeLessThan(1.2);
    });
  });

  describe('formatTrailLength', () => {
    it('formats trail length into miles and km strings', () => {
      const result = formatTrailLength(2.5);
      expect(result.miles).toBe('2.5 mi');
      expect(result.km).toBe('4.0 km');
      expect(result.formatted).toBe('2.5 miles (4.0 km)');
    });
  });

  describe('getDifficultyColor', () => {
    it('returns expected colors for each difficulty tier', () => {
      expect(getDifficultyColor('easy')).toBe('#10B981');
      expect(getDifficultyColor('intermediate')).toBe('#3B82F6');
      expect(getDifficultyColor('advanced')).toBe('#111827');
      expect(getDifficultyColor('expert')).toBe('#EF4444');
      expect(getDifficultyColor('unknown')).toBe('#F97316');
    });
  });

  describe('getDifficultyBadge', () => {
    it('returns badge info with symbol, labels, and classes for easy', () => {
      const badge = getDifficultyBadge('easy');
      expect(badge.label).toContain('Easy');
      expect(badge.symbol).toBe('🟢');
      expect(badge.color).toBe('#10B981');
    });

    it('returns badge info for intermediate', () => {
      const badge = getDifficultyBadge('intermediate');
      expect(badge.label).toContain('Intermediate');
      expect(badge.symbol).toBe('🔷');
      expect(badge.color).toBe('#3B82F6');
    });

    it('returns badge info for advanced (Black Diamond)', () => {
      const badge = getDifficultyBadge('advanced');
      expect(badge.label).toContain('Advanced');
      expect(badge.symbol).toBe('◆');
      expect(badge.color).toBe('#111827');
    });

    it('returns badge info for expert (Double Black)', () => {
      const badge = getDifficultyBadge('expert');
      expect(badge.label).toContain('Expert');
      expect(badge.symbol).toBe('◆◆');
      expect(badge.color).toBe('#EF4444');
    });

    it('returns fallback badge info for unknown', () => {
      const badge = getDifficultyBadge('unknown');
      expect(badge.label).toContain('Unrated');
      expect(badge.symbol).toBe('🟠');
      expect(badge.color).toBe('#F97316');
    });
  });
});

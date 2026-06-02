import { describe, it, expect } from 'vitest';
import { getDifficultyColor, formatPriceAbbreviation } from '../components/PropertyMap';

describe('PropertyMap Utilities', () => {
  describe('getDifficultyColor', () => {
    it('returns green for easy difficulty', () => {
      expect(getDifficultyColor('easy')).toBe('#10B981');
    });

    it('returns blue for intermediate difficulty', () => {
      expect(getDifficultyColor('intermediate')).toBe('#3B82F6');
    });

    it('returns dark gray/black for advanced difficulty', () => {
      expect(getDifficultyColor('advanced')).toBe('#111827');
    });

    it('returns red for expert difficulty', () => {
      expect(getDifficultyColor('expert')).toBe('#EF4444');
    });

    it('returns vibrant orange as fallback', () => {
      expect(getDifficultyColor('unknown')).toBe('#F97316');
      // @ts-ignore
      expect(getDifficultyColor('something_else')).toBe('#F97316');
    });
  });

  describe('formatPriceAbbreviation', () => {
    it('formats numbers less than 1,000 as is', () => {
      expect(formatPriceAbbreviation(850)).toBe('$850');
    });

    it('formats thousands with k abbreviation', () => {
      expect(formatPriceAbbreviation(850000)).toBe('$850k');
      expect(formatPriceAbbreviation(999000)).toBe('$999k');
    });

    it('formats millions with M abbreviation', () => {
      expect(formatPriceAbbreviation(1250000)).toBe('$1.25M');
      expect(formatPriceAbbreviation(2000000)).toBe('$2M');
    });
  });
});

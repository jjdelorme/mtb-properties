import { TrailDifficulty, TrailPoint } from '../types';

// Earth radius in miles
const EARTH_RADIUS_MILES = 3958.8;

/**
 * Calculates straight-line distance between two latitude/longitude points in miles using Haversine formula
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculates total length of a trail polyline in miles by summing segment distances
 */
export function calculateTrailLengthMiles(coordinates: TrailPoint[]): number {
  if (!coordinates || coordinates.length < 2) return 0;
  let totalMiles = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalMiles += haversineDistanceMiles(
      coordinates[i].latitude,
      coordinates[i].longitude,
      coordinates[i + 1].latitude,
      coordinates[i + 1].longitude
    );
  }
  return parseFloat(totalMiles.toFixed(2));
}

/**
 * Formats trail length into readable miles and kilometers strings
 */
export function formatTrailLength(lengthMiles: number): {
  miles: string;
  km: string;
  formatted: string;
} {
  const milesVal = lengthMiles || 0;
  const kmVal = milesVal * 1.60934;
  const miles = `${milesVal.toFixed(1)} mi`;
  const km = `${kmVal.toFixed(1)} km`;
  const formatted = `${milesVal.toFixed(1)} miles (${kmVal.toFixed(1)} km)`;
  return { miles, km, formatted };
}

/**
 * Returns color hex code for difficulty level (maintains backward compatibility with tests)
 */
export function getDifficultyColor(difficulty: TrailDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return '#10B981'; // Green
    case 'intermediate':
      return '#3B82F6'; // Blue
    case 'advanced':
      return '#111827'; // Dark Gray / Black
    case 'expert':
      return '#EF4444'; // Red / Double Black
    case 'unknown':
    default:
      return '#F97316'; // Orange / Fallback
  }
}

export interface DifficultyBadgeInfo {
  difficulty: TrailDifficulty;
  label: string;
  shortLabel: string;
  symbol: string; // Emoji/icon representation
  color: string;  // Primary hex color
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBgHex: string;
  badgeTextHex: string;
}

/**
 * Returns rich rating/difficulty badge metadata including labels, symbols, and styling classes
 */
export function getDifficultyBadge(difficulty: TrailDifficulty): DifficultyBadgeInfo {
  switch (difficulty) {
    case 'easy':
      return {
        difficulty: 'easy',
        label: 'Easy (Beginner)',
        shortLabel: 'Easy',
        symbol: '🟢',
        color: '#10B981',
        bgClass: 'bg-emerald-100/90',
        borderClass: 'border-emerald-500',
        textClass: 'text-emerald-800 font-extrabold',
        badgeBgHex: '#10B981',
        badgeTextHex: '#FFFFFF',
      };
    case 'intermediate':
      return {
        difficulty: 'intermediate',
        label: 'Intermediate',
        shortLabel: 'Intermediate',
        symbol: '🔷',
        color: '#3B82F6',
        bgClass: 'bg-blue-100/90',
        borderClass: 'border-blue-500',
        textClass: 'text-blue-800 font-extrabold',
        badgeBgHex: '#3B82F6',
        badgeTextHex: '#FFFFFF',
      };
    case 'advanced':
      return {
        difficulty: 'advanced',
        label: 'Advanced (Black Diamond)',
        shortLabel: 'Black Diamond',
        symbol: '◆',
        color: '#111827',
        bgClass: 'bg-slate-900',
        borderClass: 'border-slate-700',
        textClass: 'text-slate-100 font-extrabold',
        badgeBgHex: '#111827',
        badgeTextHex: '#FFFFFF',
      };
    case 'expert':
      return {
        difficulty: 'expert',
        label: 'Expert (Double Black)',
        shortLabel: 'Double Black',
        symbol: '◆◆',
        color: '#EF4444',
        bgClass: 'bg-rose-950',
        borderClass: 'border-rose-600',
        textClass: 'text-rose-200 font-extrabold',
        badgeBgHex: '#EF4444',
        badgeTextHex: '#FFFFFF',
      };
    case 'unknown':
    default:
      return {
        difficulty: 'unknown',
        label: 'Unrated / Multi-Use',
        shortLabel: 'Unrated',
        symbol: '🟠',
        color: '#F97316',
        bgClass: 'bg-amber-100',
        borderClass: 'border-amber-500',
        textClass: 'text-amber-900 font-extrabold',
        badgeBgHex: '#F97316',
        badgeTextHex: '#FFFFFF',
      };
  }
}

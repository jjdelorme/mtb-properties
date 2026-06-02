import { haversineDistanceMiles, calculateProximity } from '../services/proximityService';
import { Property, Trail } from '../types';

describe('Proximity Service Mathematics', () => {
  describe('haversineDistanceMiles', () => {
    it('should accurately calculate distance between two coordinates', () => {
      // Coordinates of Golden, CO and Denver, CO (approx. 12 miles)
      const lat1 = 39.7555;
      const lon1 = -105.2211;
      const lat2 = 39.7392;
      const lon2 = -104.9903;
      
      const distance = haversineDistanceMiles(lat1, lon1, lat2, lon2);
      expect(distance).toBeGreaterThan(11.5);
      expect(distance).toBeLessThan(13.0);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = haversineDistanceMiles(39.7555, -105.2211, 39.7555, -105.2211);
      expect(distance).toBe(0);
    });
  });

  describe('calculateProximity', () => {
    const mockTrails: Trail[] = [
      {
        id: 'trail_1',
        name: 'Apex Trail',
        coordinates: [
          { latitude: 39.7161, longitude: -105.2301 }
        ],
        difficulty: 'advanced',
        highway: 'path',
        rawTags: {}
      }
    ];

    const mockProperties: Property[] = [
      {
        id: 'prop_far',
        formattedAddress: 'Far Away',
        price: 500000,
        bedrooms: 3,
        bathrooms: 2,
        squareFootage: 1500,
        propertyType: 'Single Family',
        latitude: 39.7555, // Golden center
        longitude: -105.2211,
        status: 'Active'
      },
      {
        id: 'prop_close',
        formattedAddress: 'Trailside',
        price: 800000,
        bedrooms: 3,
        bathrooms: 2.5,
        squareFootage: 2000,
        propertyType: 'Single Family',
        latitude: 39.7163, // Right by the trail coordinate
        longitude: -105.2295,
        status: 'Active'
      }
    ];

    it('should assign nearestTrail and sort properties correctly', () => {
      const results = calculateProximity(mockProperties, mockTrails);
      
      expect(results.length).toBe(2);
      
      // Close property should be first
      expect(results[0].id).toBe('prop_close');
      expect(results[0].nearestTrail?.trailId).toBe('trail_1');
      expect(results[0].nearestTrail?.distanceMiles).toBeLessThan(0.1);

      // Far property should be second
      expect(results[1].id).toBe('prop_far');
      expect(results[1].nearestTrail?.distanceMiles).toBeGreaterThan(2);
    });

    it('should handle empty trails gracefully by assigning undefined and not sorting/crashing', () => {
      const results = calculateProximity(mockProperties, []);
      expect(results.length).toBe(2);
      expect(results[0].nearestTrail).toBeUndefined();
      expect(results[1].nearestTrail).toBeUndefined();
    });
  });
});

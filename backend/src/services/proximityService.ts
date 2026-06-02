import { Property, Trail } from '../types';

export function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function calculateProximity(properties: Property[], trails: Trail[]): Property[] {
  if (trails.length === 0) {
    return properties.map(p => ({ ...p, nearestTrail: undefined }));
  }
  return properties.map(property => {
    let minDistance = Infinity;
    let nearestTrail: any = null;
    for (const trail of trails) {
      for (const point of trail.coordinates) {
        const dist = haversineDistanceMiles(property.latitude, property.longitude, point.latitude, point.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearestTrail = {
            trailId: trail.id,
            name: trail.name,
            distanceMiles: parseFloat(dist.toFixed(1)),
            closestPoint: point
          };
        }
      }
    }
    return { ...property, nearestTrail };
  }).sort((a, b) => {
    const distA = a.nearestTrail?.distanceMiles ?? Infinity;
    const distB = b.nearestTrail?.distanceMiles ?? Infinity;
    return distA - distB;
  });
}

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrailPopout from '../components/TrailPopout';
import { Property, Trail } from '../types';

const mockTrail: Trail = {
  id: 'way_golden_apex',
  name: 'Apex Trail',
  coordinates: [
    { latitude: 39.7161, longitude: -105.2301 },
    { latitude: 39.7170, longitude: -105.2350 },
    { latitude: 39.7185, longitude: -105.2410 },
  ],
  difficulty: 'advanced',
  highway: 'path',
  rawTags: { 'mtb:scale': '3', surface: 'singletrack' },
  lengthMiles: 0.85,
};

const mockProperties: Property[] = [
  {
    id: 'prop_1',
    formattedAddress: '101 Apex Trail Way, Golden, CO 80401',
    price: 850000,
    bedrooms: 3,
    bathrooms: 2.5,
    squareFootage: 2100,
    propertyType: 'Single Family',
    latitude: 39.7163,
    longitude: -105.2295,
    status: 'Active',
    nearestTrail: {
      trailId: 'way_golden_apex',
      name: 'Apex Trail',
      distanceMiles: 0.1,
      closestPoint: { latitude: 39.7161, longitude: -105.2301 },
    },
  },
];

describe('TrailPopout Component', () => {
  it('renders trail details, rating badge, length, and surface info', () => {
    const handleClose = vi.fn();
    const handleZoom = vi.fn();
    const handleSelectProperty = vi.fn();

    render(
      <TrailPopout
        trail={mockTrail}
        properties={mockProperties}
        onClose={handleClose}
        onZoomToTrail={handleZoom}
        onSelectProperty={handleSelectProperty}
      />
    );

    expect(screen.getByText('Apex Trail')).toBeInTheDocument();
    expect(screen.getByText('Advanced (Black Diamond)')).toBeInTheDocument();
    expect(screen.getByText(/0.8 mi/i)).toBeInTheDocument();
    expect(screen.getByText(/singletrack/i)).toBeInTheDocument();
    expect(screen.getByText(/Nearby Home Listings \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('101 Apex Trail Way, Golden, CO 80401')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    const handleZoom = vi.fn();
    const handleSelectProperty = vi.fn();

    render(
      <TrailPopout
        trail={mockTrail}
        properties={mockProperties}
        onClose={handleClose}
        onZoomToTrail={handleZoom}
        onSelectProperty={handleSelectProperty}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomToTrail when zoom button is clicked', () => {
    const handleClose = vi.fn();
    const handleZoom = vi.fn();
    const handleSelectProperty = vi.fn();

    render(
      <TrailPopout
        trail={mockTrail}
        properties={mockProperties}
        onClose={handleClose}
        onZoomToTrail={handleZoom}
        onSelectProperty={handleSelectProperty}
      />
    );

    const zoomBtn = screen.getByRole('button', { name: /Zoom to trail/i });
    fireEvent.click(zoomBtn);
    expect(handleZoom).toHaveBeenCalledWith(mockTrail);
  });

  it('calls onSelectProperty when a nearby home listing is clicked', () => {
    const handleClose = vi.fn();
    const handleZoom = vi.fn();
    const handleSelectProperty = vi.fn();

    render(
      <TrailPopout
        trail={mockTrail}
        properties={mockProperties}
        onClose={handleClose}
        onZoomToTrail={handleZoom}
        onSelectProperty={handleSelectProperty}
      />
    );

    const homeCard = screen.getByText('101 Apex Trail Way, Golden, CO 80401').closest('div');
    expect(homeCard).toBeInTheDocument();
    if (homeCard) {
      fireEvent.click(homeCard);
    }
    expect(handleSelectProperty).toHaveBeenCalledWith(mockProperties[0]);
  });
});

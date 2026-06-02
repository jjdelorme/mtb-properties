import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

describe('App Component', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.spyOn(window, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial state with heading and search container', () => {
    render(<App />);

    expect(screen.getByText('MTB Property Mapper MVP')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter ZIP code or City Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Use Sandbox ZIP: 80401/i)).toBeInTheDocument();
  });

  it('performs search and displays sidebar and map on successful fetch', async () => {
    const mockResponse = {
      searchQuery: '80401',
      normalizedLocation: 'Golden, Colorado, USA',
      center: { latitude: 39.7555, longitude: -105.2211 },
      properties: [
        {
          id: 'prop_golden_1',
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
            trailId: 'way_golden_trail_1',
            name: 'Apex Trail',
            distanceMiles: 0.1,
            closestPoint: { latitude: 39.7161, longitude: -105.2301 }
          }
        }
      ],
      trails: [
        {
          id: 'way_golden_trail_1',
          name: 'Apex Trail',
          coordinates: [
            { latitude: 39.7161, longitude: -105.2301 },
            { latitude: 39.7170, longitude: -105.2350 }
          ],
          difficulty: 'advanced',
          highway: 'path',
          rawTags: { 'mtb:scale': '3', name: 'Apex Trail' }
        }
      ],
      source: 'sandbox'
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<App />);

    const input = screen.getByPlaceholderText(/Enter ZIP code or City Name/i);
    fireEvent.change(input, { target: { value: '80401' } });

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    // Wait for the geocoded location or properties to render
    await waitFor(() => {
      expect(screen.getByText('Golden, Colorado, USA')).toBeInTheDocument();
    });

    // Should display the sidebar with 1 property
    expect(screen.getByText('101 Apex Trail Way, Golden, CO 80401')).toBeInTheDocument();
    expect(screen.getByText('$850,000')).toBeInTheDocument();
  });

  it('displays error banner if API returns an error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Location "99999" not found.' }),
    });

    render(<App />);

    const input = screen.getByPlaceholderText(/Enter ZIP code or City Name/i);
    fireEvent.change(input, { target: { value: '99999' } });

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText(/Location "99999" not found./i)).toBeInTheDocument();
    });
  });
});

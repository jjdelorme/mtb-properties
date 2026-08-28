import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchBar from '../components/SearchBar';
import PropertySidebar from '../components/PropertySidebar';
import PropertyCard from '../components/PropertyCard';
import StatusBanner from '../components/StatusBanner';
import { Property, Trail } from '../types';

describe('SearchBar Component', () => {
  it('renders input and search button', () => {
    const setQuery = vi.fn();
    const handleSearch = vi.fn((e) => e.preventDefault());
    
    render(
      <SearchBar 
        query="80401" 
        setQuery={setQuery} 
        handleSearch={handleSearch} 
        loading={false} 
        searchType="area"
        setSearchType={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/Enter ZIP code or City Name/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('80401');

    const button = screen.getByRole('button', { name: /Search/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('calls handleSearch on form submission', () => {
    const setQuery = vi.fn();
    const handleSearch = vi.fn((e) => e.preventDefault());
    
    render(
      <SearchBar 
        query="Moab" 
        setQuery={setQuery} 
        handleSearch={handleSearch} 
        loading={false} 
        searchType="area"
        setSearchType={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(button);
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('shows searching text when loading is true', () => {
    const setQuery = vi.fn();
    const handleSearch = vi.fn((e) => e.preventDefault());
    
    render(
      <SearchBar 
        query="Moab" 
        setQuery={setQuery} 
        handleSearch={handleSearch} 
        loading={true} 
        searchType="area"
        setSearchType={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /Searching.../i });
    expect(button).toBeDisabled();
  });

  it('calls setQuery when quick sandbox zip is clicked', () => {
    const setQuery = vi.fn();
    const handleSearch = vi.fn((e) => e.preventDefault());
    
    render(
      <SearchBar 
        query="" 
        setQuery={setQuery} 
        handleSearch={handleSearch} 
        loading={false} 
        searchType="area"
        setSearchType={vi.fn()}
      />
    );

    const quickSelectBtn = screen.getByText(/Use Sandbox ZIP: 80401/i);
    fireEvent.click(quickSelectBtn);
    expect(setQuery).toHaveBeenCalledWith('80401');
  });
});

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
      trailId: 'way_1',
      name: 'Apex Trail',
      distanceMiles: 0.1,
      closestPoint: { latitude: 39.7161, longitude: -105.2301 }
    }
  },
  {
    id: 'prop_2',
    formattedAddress: '450 Lookout Mountain Rd, Golden, CO 80401',
    price: 1250000,
    bedrooms: 4,
    bathrooms: 4,
    squareFootage: 3400,
    propertyType: 'Single Family',
    latitude: 39.7423,
    longitude: -105.2405,
    status: 'Active',
    nearestTrail: {
      trailId: 'way_2',
      name: 'Chimney Gulch Trail',
      distanceMiles: 1.2,
      closestPoint: { latitude: 39.7430, longitude: -105.2410 }
    }
  }
];

describe('PropertyCard Component', () => {
  it('renders property details and formatted price', () => {
    const handleSelect = vi.fn();
    render(
      <PropertyCard 
        property={mockProperties[0]} 
        isSelected={false} 
        onSelect={handleSelect} 
      />
    );

    expect(screen.getByText('$850,000')).toBeInTheDocument();
    expect(screen.getByText('101 Apex Trail Way, Golden, CO 80401')).toBeInTheDocument();
    expect(screen.getByText('3 Bed | 2.5 Bath | 2,100 sqft')).toBeInTheDocument();
    expect(screen.getByText(/Nearest Trail: Apex Trail/i)).toBeInTheDocument();
    expect(screen.getByText('0.1 miles')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const handleSelect = vi.fn();
    render(
      <PropertyCard 
        property={mockProperties[0]} 
        isSelected={false} 
        onSelect={handleSelect} 
      />
    );

    const card = screen.getByText('101 Apex Trail Way, Golden, CO 80401').closest('div');
    expect(card).toBeInTheDocument();
    if (card) {
      fireEvent.click(card);
    }
    expect(handleSelect).toHaveBeenCalledWith(mockProperties[0]);
  });

  it('applies selected styling when isSelected is true', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <PropertyCard 
        property={mockProperties[0]} 
        isSelected={true} 
        onSelect={handleSelect} 
      />
    );

    // Should have ring or border class indicating selection
    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv).toHaveClass('border-emerald-500');
    expect(cardDiv).toHaveClass('bg-emerald-50/40');
  });
});

describe('PropertySidebar Component', () => {
  it('renders a list of properties', () => {
    const handleSelect = vi.fn();
    render(
      <PropertySidebar 
        properties={mockProperties} 
        selectedProperty={null} 
        onSelectProperty={handleSelect} 
      />
    );

    expect(screen.getByText('$850,000')).toBeInTheDocument();
    expect(screen.getByText('$1,250,000')).toBeInTheDocument();
    expect(screen.getByText('101 Apex Trail Way, Golden, CO 80401')).toBeInTheDocument();
    expect(screen.getByText('450 Lookout Mountain Rd, Golden, CO 80401')).toBeInTheDocument();
  });

  it('renders an empty state message if properties is empty', () => {
    const handleSelect = vi.fn();
    render(
      <PropertySidebar 
        properties={[]} 
        selectedProperty={null} 
        onSelectProperty={handleSelect} 
      />
    );

    expect(screen.getByText(/No listings found/i)).toBeInTheDocument();
  });

  it('switches to Trails tab and renders nearby trails with difficulty badges', () => {
    const handleSelectProp = vi.fn();
    const handleSelectTrail = vi.fn();
    const mockTrails: Trail[] = [
      {
        id: 'way_apex',
        name: 'Apex Trail',
        coordinates: [
          { latitude: 39.7161, longitude: -105.2301 },
          { latitude: 39.7170, longitude: -105.2350 },
        ],
        difficulty: 'advanced',
        highway: 'path',
        rawTags: { 'mtb:scale': '3' },
        lengthMiles: 1.2,
      },
    ];

    render(
      <PropertySidebar
        properties={mockProperties}
        trails={mockTrails}
        selectedProperty={null}
        onSelectProperty={handleSelectProp}
        onSelectTrail={handleSelectTrail}
      />
    );

    const trailsTab = screen.getByRole('button', { name: /Trails/i });
    fireEvent.click(trailsTab);

    expect(screen.getByText('Apex Trail')).toBeInTheDocument();
    expect(screen.getByText('Black Diamond')).toBeInTheDocument();

    const trailCard = screen.getByText('Apex Trail').closest('div');
    if (trailCard) {
      fireEvent.click(trailCard);
    }
    expect(handleSelectTrail).toHaveBeenCalledWith(mockTrails[0]);
  });
});

describe('StatusBanner Component', () => {
  it('renders status message correctly', () => {
    const message = 'Live listings limit reached. Showing demo/cached listings for this area.';
    render(<StatusBanner message={message} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });
});

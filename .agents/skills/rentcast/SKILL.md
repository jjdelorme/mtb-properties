---
name: rentcast
description: >-
  Query live real estate data from the RentCast API including active sale/rental listings,
  deep property records, automated valuations (AVM), comps, and long-term rental estimates.
  Includes built-in local disk caching and test fixture generators.
---

# RentCast Real Estate Data Skill

This skill provides Python CLI accessors and an SDK client for the **RentCast Real Estate API** (`https://api.rentcast.io/v1`).

Use this skill when you need to:
1. **Search Real Estate Listings**: Fetch active for-sale or rental listings by coordinates/radius, zip code, city/state, or price/beds/baths filters.
2. **Retrieve Property Specs & Records**: Inspect tax assessments, square footage, year built, lot size, owner status, and past sales history.
3. **Analyze Property Valuations (AVM)**: Fetch estimated market values and nearby comparable home sales with correlation scores.
4. **Evaluate Rental Cash Flow**: Fetch estimated monthly rent, rent ranges, and comparable rental properties (for STR/LTR analysis).
5. **Seed Sandbox Test Fixtures**: Generate formatted JSON fixture datasets for mock cities and unit tests.

---

## Environment & Authentication

The client automatically detects `RENTCAST_API_KEY` in:
1. The active shell environment (`os.environ`)
2. The project root `.env` file
3. The `backend/.env` file

To override manually, pass the API key or set the environment variable.

---

## Local Disk Caching

All scripts default to caching responses locally in `.agents/skills/rentcast/.cache/` (TTL: 24 hours) to preserve API quota and speed up repeated lookups.
* To bypass cache and force a live API request, pass `--no-cache`.

---

## Available CLI Tools

All scripts are located in `.agents/skills/rentcast/scripts/`.

### 1. Active Listings (`get_listings.py`)
Search active sale or rental listings.

```bash
# Search by Zip Code
python3 .agents/skills/rentcast/scripts/get_listings.py --zip 80401 --limit 10

# Search by City & State with filters
python3 .agents/skills/rentcast/scripts/get_listings.py --city Golden --state CO --min-beds 3 --max-price 1000000

# Search by Lat/Lon & Radius (in miles)
python3 .agents/skills/rentcast/scripts/get_listings.py --lat 39.7555 --lon -105.2211 --radius 5 --type sale

# Search for Rentals and output JSON
python3 .agents/skills/rentcast/scripts/get_listings.py --zip 80401 --type rental --json
```

**Key Arguments:**
* `--type`: `sale` (default) or `rental`
* `-z`, `--zip`: 5-digit US Zip Code
* `-c`, `--city` & `-s`, `--state`: City and 2-letter state code
* `--lat`, `--lon`, `-r`, `--radius`: Coordinate search with radius in miles (default: 10)
* `--property-type`: `Single Family`, `Condo`, `Townhouse`, `Manufactured`, `Multi-Family`
* `--min-price`, `--max-price`, `--min-beds`, `--max-beds`, `--min-baths`, `--max-baths`
* `--limit`: Max results (default: 25)
* `--json`: Print raw JSON to stdout

---

### 2. Property Valuation & Comps (`get_valuation.py`)
Get an Automated Valuation Model (AVM) price estimate and comparable sold properties.

```bash
# Value estimate by address
python3 .agents/skills/rentcast/scripts/get_valuation.py --address "166 S Terry St, Golden, CO 80401"

# Value estimate with custom structural attributes
python3 .agents/skills/rentcast/scripts/get_valuation.py --address "450 Lookout Mountain Rd, Golden, CO" --beds 4 --baths 3.5 --sqft 3200

# Output raw JSON
python3 .agents/skills/rentcast/scripts/get_valuation.py --address "166 S Terry St, Golden, CO 80401" --json
```

---

### 3. Long-Term Rent Estimate & Comps (`get_rent_estimate.py`)
Get estimated monthly rent and rental comps for cash flow modeling.

```bash
# Rent estimate by address
python3 .agents/skills/rentcast/scripts/get_rent_estimate.py --address "166 S Terry St, Golden, CO 80401"

# With attribute overrides
python3 .agents/skills/rentcast/scripts/get_rent_estimate.py --address "101 Apex Trail Way, Golden, CO" --beds 3 --baths 2 --sqft 1800
```

---

### 4. Property Records & History (`get_property.py`)
Fetch comprehensive deed, tax, and structural data for a property.

```bash
python3 .agents/skills/rentcast/scripts/get_property.py --address "166 S Terry St, Golden, CO 80401"
python3 .agents/skills/rentcast/scripts/get_property.py --property-id "<rentcast_property_id>"
```

---

### 5. Seed Sandbox Fixtures (`seed_sandbox_fixtures.py`)
Fetches listings for a zip code and generates a sandbox mock file compatible with `backend/src/data/sandbox/<zip>_properties.json`.

```bash
# Seed Sedona, AZ (86336)
python3 .agents/skills/rentcast/scripts/seed_sandbox_fixtures.py --zip 86336 --limit 15

# Seed Bentonville, AR (72712)
python3 .agents/skills/rentcast/scripts/seed_sandbox_fixtures.py --zip 72712 --city Bentonville --state AR --limit 20
```

---

## Python Programmatic Usage

For agents writing custom analysis scripts:

```python
import sys
from pathlib import Path

# Add scripts directory
sys.path.insert(0, str(Path("/home/jasondel/dev/mtb-properties/.agents/skills/rentcast/scripts")))
from rentcast_client import RentCastClient

client = RentCastClient()

# Get listings
listings = client.get_listings(zip_code="80401", limit=10)

# Get valuation
valuation = client.get_valuation(address="166 S Terry St, Golden, CO 80401")
print(f"Estimated Value: ${valuation['price']:,}")

# Get rental estimate
rental = client.get_rent_estimate(address="166 S Terry St, Golden, CO 80401")
print(f"Estimated Rent: ${rental['rent']:,}/mo")
```

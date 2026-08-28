#!/usr/bin/env python3
"""
CLI tool to query active sale or rental listings from RentCast.

Usage examples:
    python3 get_listings.py --zip 80401 --limit 10
    python3 get_listings.py --city Golden --state CO --min-beds 3 --max-price 900000
    python3 get_listings.py --lat 39.7555 --lon -105.2211 --radius 5 --type sale
    python3 get_listings.py --zip 84532 --json
"""

import sys
import json
import argparse
from pathlib import Path

# Add script dir to path to import rentcast_client
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rentcast_client import RentCastClient, RentCastError


def format_currency(val):
    if val is None:
        return "N/A"
    return f"${val:,.0f}"


def print_table(listings):
    if not listings:
        print("No listings found matching criteria.")
        return

    print(f"\nFound {len(listings)} listing(s):\n")
    header = f"{'#':<3} {'Address':<40} {'Price':<12} {'Beds':<6} {'Baths':<6} {'SqFt':<8} {'Type':<16} {'Status':<8}"
    print(header)
    print("-" * len(header))

    for idx, item in enumerate(listings, 1):
        addr = (item.get("formattedAddress") or "Unknown Address")[:38]
        price = format_currency(item.get("price"))
        beds = str(item.get("bedrooms") or "-")
        baths = str(item.get("bathrooms") or "-")
        sqft = str(item.get("squareFootage") or "-")
        ptype = (item.get("propertyType") or "N/A")[:15]
        status = item.get("status", "Active")
        print(f"{idx:<3} {addr:<40} {price:<12} {beds:<6} {baths:<6} {sqft:<8} {ptype:<16} {status:<8}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Query RentCast Real Estate Listings")
    parser.add_argument("--type", choices=["sale", "rental"], default="sale", help="Listing type (sale or rental, default: sale)")
    parser.add_argument("-z", "--zip", dest="zip_code", help="5-digit US Zip Code")
    parser.add_argument("-c", "--city", help="City name")
    parser.add_argument("-s", "--state", help="2-letter State code (e.g. CO)")
    parser.add_argument("-a", "--address", help="Full street address")
    parser.add_argument("--lat", type=float, help="Latitude coordinate")
    parser.add_argument("--lon", type=float, help="Longitude coordinate")
    parser.add_argument("-r", "--radius", type=float, default=10.0, help="Search radius in miles (default: 10)")
    parser.add_argument("--property-type", choices=["Single Family", "Condo", "Townhouse", "Manufactured", "Multi-Family"], help="Property type filter")
    parser.add_argument("--min-price", type=float, help="Minimum price")
    parser.add_argument("--max-price", type=float, help="Maximum price")
    parser.add_argument("--min-beds", type=int, help="Minimum bedrooms")
    parser.add_argument("--max-beds", type=int, help="Maximum bedrooms")
    parser.add_argument("--min-baths", type=float, help="Minimum bathrooms")
    parser.add_argument("--max-baths", type=float, help="Maximum bathrooms")
    parser.add_argument("--limit", type=int, default=25, help="Max results to fetch (default: 25)")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local cache and force live API request")
    parser.add_argument("--json", action="store_true", help="Output raw JSON to stdout")

    args = parser.parse_args()

    if not any([args.zip_code, (args.city and args.state), args.address, (args.lat is not None and args.lon is not None)]):
        parser.error("Must specify at least one location search parameter: --zip, --city and --state, --address, or --lat and --lon.")

    try:
        client = RentCastClient(enable_cache=not args.no_cache)
        results = client.get_listings(
            listing_type=args.type,
            address=args.address,
            city=args.city,
            state=args.state,
            zip_code=args.zip_code,
            latitude=args.lat,
            longitude=args.lon,
            radius=args.radius if (args.lat is not None and args.lon is not None) else None,
            property_type=args.property_type,
            min_price=args.min_price,
            max_price=args.max_price,
            min_bedrooms=args.min_beds,
            max_bedrooms=args.max_beds,
            min_bathrooms=args.min_baths,
            max_bathrooms=args.max_baths,
            limit=args.limit,
            use_cache=not args.no_cache
        )

        if args.json:
            print(json.dumps(results, indent=2))
        else:
            print_table(results)

    except RentCastError as e:
        sys.stderr.write(f"RentCast Error: {e}\n")
        if e.status_code:
            sys.stderr.write(f"Status Code: {e.status_code}\n")
        sys.exit(1)
    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

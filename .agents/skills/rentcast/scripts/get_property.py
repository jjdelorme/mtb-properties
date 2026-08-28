#!/usr/bin/env python3
"""
CLI tool to query detailed property records from RentCast.

Usage examples:
    python3 get_property.py --address "101 Apex Trail Way, Golden, CO 80401"
    python3 get_property.py --property-id "prop_123456" --json
"""

import sys
import json
import argparse
from pathlib import Path

# Add script dir to path to import rentcast_client
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rentcast_client import RentCastClient, RentCastError


def print_property_summary(prop):
    if isinstance(prop, list):
        if not prop:
            print("No property found.")
            return
        prop = prop[0]

    print("\n--- Property Details ---")
    print(f"ID:                 {prop.get('id', 'N/A')}")
    print(f"Address:            {prop.get('formattedAddress', 'N/A')}")
    print(f"Property Type:      {prop.get('propertyType', 'N/A')}")
    print(f"Bedrooms / Baths:   {prop.get('bedrooms', '-')} beds / {prop.get('bathrooms', '-')} baths")
    print(f"Square Footage:     {prop.get('squareFootage', 'N/A')} sq ft")
    print(f"Lot Size:           {prop.get('lotSize', 'N/A')} sq ft")
    print(f"Year Built:         {prop.get('yearBuilt', 'N/A')}")
    print(f"Coordinates:        {prop.get('latitude', 'N/A')}, {prop.get('longitude', 'N/A')}")
    print(f"Owner Occupied:     {prop.get('ownerOccupied', 'N/A')}")

    tax_info = prop.get("taxAssessment") or {}
    if tax_info:
        year = tax_info.get("year", "N/A")
        value = tax_info.get("value")
        val_str = f"${value:,.0f}" if value is not None else "N/A"
        print(f"Tax Assessment:     {val_str} ({year})")

    last_sale = prop.get("lastSale") or {}
    if last_sale:
        sale_date = last_sale.get("date", "N/A")
        sale_price = last_sale.get("price")
        price_str = f"${sale_price:,.0f}" if sale_price is not None else "N/A"
        print(f"Last Sale:          {price_str} on {sale_date}")

    features = prop.get("features") or {}
    if features:
        print("\nFeatures:")
        for k, v in features.items():
            print(f"  - {k}: {v}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Query RentCast Detailed Property Records")
    parser.add_argument("-a", "--address", help="Full street address (e.g., '123 Main St, City, ST 12345')")
    parser.add_argument("-id", "--property-id", help="RentCast property identifier")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local cache and force live API request")
    parser.add_argument("--json", action="store_true", help="Output raw JSON to stdout")

    args = parser.parse_args()

    if not args.address and not args.property_id:
        parser.error("Must provide either --address or --property-id.")

    try:
        client = RentCastClient(enable_cache=not args.no_cache)
        result = client.get_property(
            address=args.address,
            property_id=args.property_id,
            use_cache=not args.no_cache
        )

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_property_summary(result)

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

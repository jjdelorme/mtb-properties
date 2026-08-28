#!/usr/bin/env python3
"""
CLI tool to query Long-Term Rental Estimates & Comps from RentCast.

Usage examples:
    python3 get_rent_estimate.py --address "101 Apex Trail Way, Golden, CO 80401"
    python3 get_rent_estimate.py --address "1804 North Table Mountain Dr, Golden, CO" --beds 3 --baths 2 --sqft 1750
    python3 get_rent_estimate.py --address "920 Washington Ave, Golden, CO 80401" --json
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
    return f"${val:,.0f}/mo"


def print_rent_summary(data):
    if not data:
        print("No rental estimate data returned.")
        return

    rent = data.get("rent")
    rent_range_low = data.get("rentRangeLow")
    rent_range_high = data.get("rentRangeHigh")

    print("\n=== RentCast Long-Term Rent Estimate ===")
    print(f"Estimated Monthly Rent: {format_currency(rent)}")
    print(f"Rent Range:             {format_currency(rent_range_low)} - {format_currency(rent_range_high)}")

    comps = data.get("comparables") or []
    if comps:
        print(f"\nRental Comps ({len(comps)} comps):")
        header = f"{'#':<3} {'Address':<38} {'Rent':<12} {'Dist (mi)':<10} {'Beds':<6} {'Baths':<6} {'SqFt':<8} {'Corr':<6}"
        print(header)
        print("-" * len(header))
        for idx, comp in enumerate(comps, 1):
            addr = (comp.get("formattedAddress") or "N/A")[:36]
            c_rent = format_currency(comp.get("price"))
            dist = f"{comp.get('distance', 0):.2f}"
            beds = str(comp.get("bedrooms") or "-")
            baths = str(comp.get("bathrooms") or "-")
            sqft = str(comp.get("squareFootage") or "-")
            corr = f"{comp.get('correlation', 0):.2f}"
            print(f"{idx:<3} {addr:<38} {c_rent:<12} {dist:<10} {beds:<6} {baths:<6} {sqft:<8} {corr:<6}")
    print()


def main():
    parser = argparse.ArgumentParser(description="Query RentCast Long-Term Rent Estimate & Comps")
    parser.add_argument("-a", "--address", required=True, help="Full street address of target property")
    parser.add_argument("--property-type", choices=["Single Family", "Condo", "Townhouse", "Manufactured", "Multi-Family"], help="Property type override")
    parser.add_argument("--beds", type=int, help="Bedroom count override")
    parser.add_argument("--baths", type=float, help="Bathroom count override")
    parser.add_argument("--sqft", type=int, help="Square footage override")
    parser.add_argument("--comps", type=int, default=5, help="Number of comps to return (default: 5)")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local cache and force live API request")
    parser.add_argument("--json", action="store_true", help="Output raw JSON to stdout")

    args = parser.parse_args()

    try:
        client = RentCastClient(enable_cache=not args.no_cache)
        result = client.get_rent_estimate(
            address=args.address,
            property_type=args.property_type,
            bedrooms=args.beds,
            bathrooms=args.baths,
            square_footage=args.sqft,
            comp_count=args.comps,
            use_cache=not args.no_cache
        )

        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_rent_summary(result)

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

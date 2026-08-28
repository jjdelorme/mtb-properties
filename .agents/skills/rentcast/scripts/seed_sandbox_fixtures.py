#!/usr/bin/env python3
"""
Seed Sandbox Fixtures CLI tool.

Fetches live listings for a specified zip code / city via RentCast and formats them
into a clean sandbox JSON fixture file suitable for `backend/src/data/sandbox/<zip>_properties.json`.

Usage examples:
    python3 seed_sandbox_fixtures.py --zip 86336 --limit 15
    python3 seed_sandbox_fixtures.py --zip 72712 --city Bentonville --state AR --limit 20
    python3 seed_sandbox_fixtures.py --zip 81301 --out /path/to/custom_properties.json
"""

import sys
import json
import argparse
from pathlib import Path

# Add script dir to path to import rentcast_client
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rentcast_client import RentCastClient, RentCastError


def main():
    parser = argparse.ArgumentParser(description="Seed Backend Sandbox Property Fixtures from RentCast")
    parser.add_argument("-z", "--zip", dest="zip_code", required=True, help="5-digit US Zip Code")
    parser.add_argument("-c", "--city", help="City name (optional)")
    parser.add_argument("-s", "--state", help="2-letter state code (optional)")
    parser.add_argument("-l", "--limit", type=int, default=15, help="Number of listings to seed (default: 15)")
    parser.add_argument("-o", "--out", help="Output file path (default: backend/src/data/sandbox/<zip>_properties.json)")
    parser.add_argument("--no-cache", action="store_true", help="Bypass local cache")

    args = parser.parse_args()

    # Determine output path
    if args.out:
        out_path = Path(args.out)
    else:
        repo_root = Path(__file__).resolve().parents[3]
        sandbox_dir = repo_root / "backend" / "src" / "data" / "sandbox"
        sandbox_dir.mkdir(parents=True, exist_ok=True)
        out_path = sandbox_dir / f"{args.zip_code}_properties.json"

    print(f"Fetching up to {args.limit} sale listings for zip {args.zip_code}...")

    try:
        client = RentCastClient(enable_cache=not args.no_cache)
        listings = client.get_listings(
            listing_type="sale",
            zip_code=args.zip_code,
            city=args.city,
            state=args.state,
            limit=args.limit,
            use_cache=not args.no_cache
        )

        if not listings:
            print(f"Warning: No listings returned from RentCast for zip {args.zip_code}.")
            sys.exit(0)

        # Map to backend Property schema
        formatted_properties = []
        for idx, item in enumerate(listings, 1):
            prop = {
                "id": item.get("id") or f"prop_{args.zip_code}_{idx}",
                "formattedAddress": item.get("formattedAddress") or "Unknown Address",
                "price": item.get("price") or 0,
                "bedrooms": item.get("bedrooms") or 0,
                "bathrooms": item.get("bathrooms") or 0,
                "squareFootage": item.get("squareFootage") or 0,
                "propertyType": item.get("propertyType") or "Single Family",
                "latitude": float(item.get("latitude")) if item.get("latitude") is not None else 0.0,
                "longitude": float(item.get("longitude")) if item.get("longitude") is not None else 0.0,
                "status": item.get("status") or "Active"
            }
            if item.get("photoUrl"):
                prop["photoUrl"] = item.get("photoUrl")
            formatted_properties.append(prop)

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(formatted_properties, f, indent=2)

        print(f"Successfully saved {len(formatted_properties)} properties to {out_path}")

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

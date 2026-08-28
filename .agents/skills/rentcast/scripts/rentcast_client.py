#!/usr/bin/env python3
"""
RentCast API Python Client.

Provides access to RentCast Real Estate Data API:
- For-sale and rental listings
- Property records and specs
- Property valuations & AVM comps
- Long-term rent estimates & comps
- Market aggregate statistics

Includes automatic API key resolution (.env traversal) and local disk caching.
"""

import os
import sys
import json
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


def _find_env_file() -> Optional[Path]:
    """Find .env file in current directory, parent directories, or backend/.env."""
    cwd = Path.cwd()
    search_paths = [
        cwd / ".env",
        cwd / "backend" / ".env",
        cwd.parent / ".env",
        cwd.parent / "backend" / ".env",
        Path(__file__).resolve().parents[3] / ".env",
        Path(__file__).resolve().parents[3] / "backend" / ".env",
    ]
    for p in search_paths:
        if p.is_file():
            return p
    return None


def _load_env_key(key: str) -> Optional[str]:
    """Load an environment variable from process env or discovered .env files."""
    val = os.environ.get(key)
    if val and val.strip():
        return val.strip()

    env_path = _find_env_file()
    if not env_path or not env_path.is_file():
        return None

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == key:
                    cleaned_val = v.strip().strip("'\"")
                    if cleaned_val:
                        return cleaned_val
    except Exception:
        pass
    return None


class RentCastError(Exception):
    """Custom exception for RentCast API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class RentCastClient:
    """Client for interacting with the RentCast API."""

    BASE_URL = "https://api.rentcast.io/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        cache_dir: Optional[Union[str, Path]] = None,
        cache_ttl_hours: float = 24.0,
        enable_cache: bool = True
    ):
        self.api_key = api_key or _load_env_key("RENTCAST_API_KEY")
        self.enable_cache = enable_cache
        self.cache_ttl_seconds = cache_ttl_hours * 3600.0

        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            # Default to .cache/rentcast in the skill folder
            self.cache_dir = Path(__file__).resolve().parent.parent / ".cache"

        if self.enable_cache:
            self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_path(self, endpoint: str, params: Dict[str, Any]) -> Path:
        """Compute MD5 cache filename based on endpoint and sorted query params."""
        param_str = json.dumps(params, sort_keys=True)
        key = f"{endpoint}::{param_str}"
        hashed = hashlib.md5(key.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{hashed}.json"

    def _read_cache(self, endpoint: str, params: Dict[str, Any]) -> Optional[Any]:
        if not self.enable_cache:
            return None
        cache_file = self._get_cache_path(endpoint, params)
        if not cache_file.exists():
            return None

        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            cached_time = data.get("_cached_at", 0)
            if time.time() - cached_time > self.cache_ttl_seconds:
                return None
            return data.get("payload")
        except Exception:
            return None

    def _write_cache(self, endpoint: str, params: Dict[str, Any], payload: Any) -> None:
        if not self.enable_cache:
            return
        try:
            cache_file = self._get_cache_path(endpoint, params)
            data = {
                "_cached_at": time.time(),
                "endpoint": endpoint,
                "params": params,
                "payload": payload
            }
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception:
            pass

    def _request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Any:
        """Execute a GET request to the RentCast API."""
        clean_params = {k: v for k, v in (params or {}).items() if v is not None and v != ""}

        if use_cache:
            cached = self._read_cache(endpoint, clean_params)
            if cached is not None:
                return cached

        if not self.api_key or self.api_key.startswith("dummy_"):
            raise RentCastError(
                "A valid RentCast API key is required. Set RENTCAST_API_KEY in your environment or .env file.",
                status_code=401
            )

        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"
        if clean_params:
            url += f"?{urllib.parse.urlencode(clean_params)}"

        req = urllib.request.Request(
            url,
            headers={
                "Accept": "application/json",
                "X-Api-Key": self.api_key,
                "User-Agent": "MTB-Properties-Agent/1.0"
            },
            method="GET"
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                status_code = response.getcode()
                raw_body = response.read().decode("utf-8")
                data = json.loads(raw_body)
                if use_cache:
                    self._write_cache(endpoint, clean_params, data)
                return data
        except urllib.error.HTTPError as e:
            status_code = e.code
            err_msg = e.reason
            resp_data = None
            try:
                body = e.read().decode("utf-8")
                resp_data = json.loads(body)
                if isinstance(resp_data, dict) and "message" in resp_data:
                    err_msg = resp_data["message"]
            except Exception:
                pass

            if status_code == 401:
                raise RentCastError(f"Unauthorized: Invalid API key ({err_msg})", status_code, resp_data)
            elif status_code == 402:
                raise RentCastError(f"Payment Required: RentCast quota exceeded ({err_msg})", status_code, resp_data)
            elif status_code == 429:
                raise RentCastError(f"Too Many Requests: Rate limit reached ({err_msg})", status_code, resp_data)
            else:
                raise RentCastError(f"RentCast HTTP {status_code}: {err_msg}", status_code, resp_data)
        except urllib.error.URLError as e:
            raise RentCastError(f"Network error connecting to RentCast: {e.reason}")
        except Exception as e:
            raise RentCastError(f"Unexpected error: {str(e)}")

    def get_listings(
        self,
        listing_type: str = "sale",
        address: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
        zip_code: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius: Optional[float] = None,
        property_type: Optional[str] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_bedrooms: Optional[int] = None,
        max_bedrooms: Optional[int] = None,
        min_bathrooms: Optional[float] = None,
        max_bathrooms: Optional[float] = None,
        status: str = "active",
        limit: int = 50,
        offset: int = 0,
        use_cache: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch property listings (for sale or rental).

        :param listing_type: 'sale' or 'rental'
        :param address: Full street address
        :param city: City name
        :param state: 2-letter state code
        :param zip_code: 5-digit US zip code
        :param latitude: Latitude coordinate
        :param longitude: Longitude coordinate
        :param radius: Radius in miles (when using lat/lon)
        :param property_type: 'Single Family', 'Condo', 'Townhouse', 'Manufactured', 'Multi-Family'
        :param status: 'active' or 'inactive'
        :param limit: Number of records to return (1-500)
        :param offset: Pagination offset
        :param use_cache: Whether to use disk cache
        """
        endpoint = f"listings/{listing_type.lower()}"
        params: Dict[str, Any] = {
            "address": address,
            "city": city,
            "state": state,
            "zipCode": zip_code,
            "latitude": latitude,
            "longitude": longitude,
            "radius": radius,
            "propertyType": property_type,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "priceMin": min_price,
            "priceMax": max_price,
            "bedroomsMin": min_bedrooms,
            "bedroomsMax": max_bedrooms,
            "bathroomsMin": min_bathrooms,
            "bathroomsMax": max_bathrooms,
            "status": status,
            "limit": limit,
            "offset": offset
        }
        return self._request(endpoint, params, use_cache=use_cache)

    def get_property(
        self,
        address: Optional[str] = None,
        property_id: Optional[str] = None,
        use_cache: bool = True
    ) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Fetch detailed property records (tax assessments, deed history, structural details).
        """
        if property_id:
            return self._request(f"properties/{property_id}", use_cache=use_cache)
        if not address:
            raise ValueError("Either address or property_id must be provided.")
        return self._request("properties", {"address": address}, use_cache=use_cache)

    def get_valuation(
        self,
        address: str,
        property_type: Optional[str] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        square_footage: Optional[int] = None,
        comp_count: int = 5,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get Automated Valuation Model (AVM) estimate and comparable sales for a property.
        """
        params = {
            "address": address,
            "propertyType": property_type,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "squareFootage": square_footage,
            "compCount": comp_count
        }
        return self._request("avm/value", params, use_cache=use_cache)

    def get_rent_estimate(
        self,
        address: str,
        property_type: Optional[str] = None,
        bedrooms: Optional[int] = None,
        bathrooms: Optional[float] = None,
        square_footage: Optional[int] = None,
        comp_count: int = 5,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get long-term rental estimate and rental comps for a property.
        """
        params = {
            "address": address,
            "propertyType": property_type,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "squareFootage": square_footage,
            "compCount": comp_count
        }
        return self._request("avm/rent/long-term", params, use_cache=use_cache)

    def get_market_averages(
        self,
        zip_code: Optional[str] = None,
        history_range: Optional[int] = 12,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get aggregate market metrics for a zip code.
        """
        params = {
            "zipCode": zip_code,
            "historyRange": history_range
        }
        return self._request("markets", params, use_cache=use_cache)

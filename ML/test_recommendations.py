#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import requests

BASE = "http://127.0.0.1:8000"


def main() -> None:
    health = requests.get(f"{BASE}/health", timeout=15)
    print("HEALTH:", health.status_code, health.json())

    response = requests.get(f"{BASE}/recommendations/u-1?limit=6", timeout=20)
    print("RECOMMENDATIONS_STATUS:", response.status_code)
    print(json.dumps(response.json(), ensure_ascii=False, indent=2)[:1500])


if __name__ == "__main__":
    main()

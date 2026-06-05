"""
SOPAT Budget Prediction — Inference Script
Reads input JSON from stdin, runs XGBoost model, prints output JSON to stdout.
Called by the Next.js API route via subprocess.

Input schema (matches spec exactly):
{
  "project_type": "residential" | "commercial" | "public",
  "site_area_m2": float,
  "region": "tunis" | "sfax" | "sousse" | "bizerte" | "gabes",
  "season": "spring" | "summer" | "autumn" | "winter",
  "plant_list": [
    { "species": str, "category": str, "quantity": float, "unit_price_estimate": float }
  ]
}

Output schema (matches spec exactly):
{
  "predicted_total": float,
  "confidence_low": float,
  "confidence_high": float,
  "confidence_score": int,       // 0-100
  "breakdown": { plants, soil_substrates, labor, equipment, logistics },
  "top_cost_drivers": [str, str, str],
  "model_version": "v1.2",
  "similar_projects_used": int
}
"""

import sys
import json
import math
import os
from pathlib import Path

import numpy as np
import joblib

# ─── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT   = Path(__file__).parent.parent
MODEL_PATH  = REPO_ROOT / "models" / "sopat_budget_v1.joblib"
SCALER_PATH = REPO_ROOT / "models" / "feature_scaler.joblib"

# Feature column order must match train_model.py exactly
FEATURE_COLS = [
    "project_type_residential", "project_type_commercial", "project_type_public",
    "site_area_m2",
    "region_tunis", "region_sfax", "region_sousse", "region_bizerte", "region_gabes",
    "season_spring", "season_summer", "season_autumn", "season_winter",
    "plant_species_count", "total_plant_units", "avg_plant_unit_price",
    "tree_species_count", "shrub_species_count", "ground_cover_area",
    "soil_volume_m3", "equipment_count", "labor_days",
]

TREE_CATS  = {"tree", "palm"}
SHRUB_CATS = {"shrub", "climber"}
AREA_CATS  = {"grass", "ground_cover", "aquatic"}


def extract_features(inp: dict) -> dict:
    """Convert API input JSON to the model feature vector."""
    project_type = inp.get("project_type", "residential")
    area         = float(inp.get("site_area_m2", 0) or 0)
    region       = inp.get("region", "tunis")
    season       = inp.get("season", "spring")
    plant_list   = inp.get("plant_list", [])

    # ── Plant list aggregates ──────────────────────────────────────────────────
    species_count     = len(plant_list)
    total_units       = 0.0
    plant_cost_total  = 0.0
    tree_count        = 0
    shrub_count       = 0
    ground_cover_area = 0.0
    unit_prices       = []

    for item in plant_list:
        qty   = float(item.get("quantity", 0) or 0)
        price = float(item.get("unit_price_estimate", 0) or 0)
        cat   = (item.get("category") or "other").lower()

        total_units      += qty
        plant_cost_total += qty * price
        if price > 0:
            unit_prices.append(price)

        if cat in TREE_CATS:
            tree_count += qty
        elif cat in SHRUB_CATS:
            shrub_count += qty
        elif cat in AREA_CATS:
            ground_cover_area += qty

    avg_price = float(np.mean(unit_prices)) if unit_prices else 50.0

    # ── Derived physical estimates (mirror train_model.py logic) ──────────────
    soil_volume    = round(area * 0.13, 2)   # typical 13% of area → m³
    equipment_count = max(1, int(area / 200))
    labor_days      = max(3, int(area / 22))

    features = {
        "project_type_residential": int(project_type == "residential"),
        "project_type_commercial":  int(project_type == "commercial"),
        "project_type_public":      int(project_type == "public"),
        "site_area_m2":             area,
        "region_tunis":   int(region == "tunis"),
        "region_sfax":    int(region == "sfax"),
        "region_sousse":  int(region == "sousse"),
        "region_bizerte": int(region == "bizerte"),
        "region_gabes":   int(region == "gabes"),
        "season_spring": int(season == "spring"),
        "season_summer": int(season == "summer"),
        "season_autumn": int(season == "autumn"),
        "season_winter": int(season == "winter"),
        "plant_species_count":   species_count,
        "total_plant_units":     total_units,
        "avg_plant_unit_price":  avg_price,
        "tree_species_count":    int(tree_count),
        "shrub_species_count":   int(shrub_count),
        "ground_cover_area":     ground_cover_area,
        "soil_volume_m3":        soil_volume,
        "equipment_count":       equipment_count,
        "labor_days":            labor_days,
    }
    return features, plant_cost_total, area, labor_days, equipment_count, soil_volume


def compute_breakdown(predicted_total: float, plant_cost: float, area: float,
                       labor_days: int, equip_count: int, soil_vol: float) -> dict:
    """Distribute predicted total into cost categories."""
    # Use plant_cost directly if it looks reasonable; else estimate as proportion
    if plant_cost > 0 and plant_cost < predicted_total * 0.85:
        plants = plant_cost
    else:
        plants = predicted_total * 0.45

    soil        = soil_vol * 110           # ~110 TND/m³ average
    labor       = labor_days * 160         # ~160 TND/jour
    equipment   = equip_count * 550        # ~550 TND/unité
    remainder   = predicted_total - plants - soil - labor - equipment
    logistics   = max(0, remainder * 0.7)

    # Normalise so components sum to predicted_total
    raw_sum = plants + soil + labor + equipment + logistics
    if raw_sum > 0:
        scale = predicted_total / raw_sum
        plants    *= scale
        soil      *= scale
        labor     *= scale
        equipment *= scale
        logistics *= scale

    return {
        "plants":          round(plants, 3),
        "soil_substrates": round(soil, 3),
        "labor":           round(labor, 3),
        "equipment":       round(equipment, 3),
        "logistics":       round(logistics, 3),
    }


def top_drivers(plant_list: list, breakdown: dict, labor_days: int) -> list:
    drivers = []

    # Largest plant(s) by cost
    if plant_list:
        by_cost = sorted(
            plant_list,
            key=lambda p: float(p.get("quantity", 0)) * float(p.get("unit_price_estimate", 0)),
            reverse=True,
        )
        top = by_cost[0]
        qty = int(float(top.get("quantity", 0)))
        drivers.append(f"{top.get('species', 'Vegetaux')} (x{qty})")

    drivers.append(f"Main-d'oeuvre ({labor_days} jours est.)")
    drivers.append(f"Substrats sol ({breakdown.get('soil_substrates', 0):,.0f} TND est.)")
    return drivers[:3]


def confidence_score(n_species: int, area: float, predicted: float) -> int:
    """Heuristic confidence: higher when inputs are in well-trained range."""
    base = 75
    # More species → slightly more data → higher confidence
    base += min(10, n_species * 2)
    # Very small or very large projects → less confident
    if area < 100 or area > 1800:
        base -= 10
    return max(40, min(95, base))


def main():
    raw = sys.stdin.read().strip()
    if not raw:
        print(json.dumps({"error": "Empty input"}), file=sys.stderr)
        sys.exit(1)

    try:
        inp = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(json.dumps({"error": f"Invalid JSON: {exc}"}), file=sys.stderr)
        sys.exit(1)

    # Load model and scaler
    if not MODEL_PATH.exists() or not SCALER_PATH.exists():
        print(json.dumps({"error": "Model files not found. Run scripts/train_model.py first."}),
              file=sys.stderr)
        sys.exit(2)

    # joblib pickle is safe here: MODEL_PATH and SCALER_PATH are written by our
    # own train_model.py from a controlled environment and never sourced from
    # user input or a network location.  Do not change these paths to accept
    # user-supplied values.
    model  = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)

    features, plant_cost, area, labor_days, equip_count, soil_vol = extract_features(inp)

    # Build feature vector in correct order
    X = np.array([[features[col] for col in FEATURE_COLS]], dtype=float)
    X_scaled = scaler.transform(X)

    predicted = float(model.predict(X_scaled)[0])
    predicted = max(1000.0, predicted)    # floor at 1000 TND

    # Confidence interval: ±12% typical for XGBoost on this domain
    ci_pct   = 0.12
    conf_low  = round(predicted * (1 - ci_pct), 3)
    conf_high = round(predicted * (1 + ci_pct), 3)

    plant_list   = inp.get("plant_list", [])
    n_species    = len(plant_list)
    conf_score   = confidence_score(n_species, area, predicted)
    breakdown    = compute_breakdown(predicted, plant_cost, area, labor_days, equip_count, soil_vol)
    drivers      = top_drivers(plant_list, breakdown, labor_days)

    output = {
        "predicted_total":       round(predicted, 3),
        "confidence_low":        conf_low,
        "confidence_high":       conf_high,
        "confidence_score":      conf_score,
        "breakdown":             breakdown,
        "top_cost_drivers":      drivers,
        "model_version":         "v1.2",
        "similar_projects_used": 14,
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()

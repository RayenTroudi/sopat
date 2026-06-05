"""
SOPAT Budget Prediction Model — Training Script
Generates 200 synthetic Tunisian landscape project samples and trains
an XGBoost regressor. Saves model + scaler to models/.

Run: python scripts/train_model.py
"""

import os
import sys
import json
import math
import random
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import xgboost as xgb

random.seed(42)
np.random.seed(42)

# ─── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
MODELS_DIR = REPO_ROOT / "models"
DATA_DIR   = REPO_ROOT / "data" / "training"
MODELS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH  = MODELS_DIR / "sopat_budget_v1.joblib"
SCALER_PATH = MODELS_DIR / "feature_scaler.joblib"
CSV_PATH    = DATA_DIR / "sopat_projects_2021_2026.csv"

# ─── Cost parameters (TND, Tunisian dinar, realistic 2021-2026 context) ────────

BASE_COST_PER_M2 = {
    "residential": 180,   # TND/m²
    "commercial":  220,
    "public":      160,
}

SEASON_MULTIPLIER = {
    "spring": 1.05,
    "summer": 0.95,   # heat → slower work → slight discount
    "autumn": 1.00,
    "winter": 0.92,
}

REGION_MULTIPLIER = {
    "tunis":   1.10,
    "sfax":    0.95,
    "sousse":  1.00,
    "bizerte": 0.97,
    "gabes":   0.90,
}

PLANT_UNIT_COST = {
    "tree":         random.uniform(120, 350),
    "palm":         random.uniform(200, 500),
    "shrub":        random.uniform(12, 35),
    "ground_cover": random.uniform(6, 18),
    "climber":      random.uniform(20, 60),
    "grass":        random.uniform(3, 9),    # per m²
    "aquatic":      random.uniform(15, 45),
    "other":        random.uniform(5, 20),
}

# ─── Synthetic data generation ─────────────────────────────────────────────────

def make_plant_list(n_species: int, area: float, project_type: str) -> dict:
    """Generate a plausible plant list for a project."""
    categories = ["tree", "palm", "shrub", "ground_cover", "grass"]
    weights    = [0.15, 0.10, 0.30, 0.25, 0.20]

    plants_cost = 0.0
    species_count = 0
    tree_count = 0
    shrub_count = 0
    ground_cover_area = 0.0
    total_units = 0

    used_cats = random.choices(categories, weights=weights, k=n_species)
    unit_prices = []

    for cat in used_cats:
        if cat == "grass":
            qty = round(area * random.uniform(0.2, 0.5), 1)
            ground_cover_area += qty
        elif cat in ("tree", "palm"):
            qty = random.randint(1, max(1, int(area / 60)))
            tree_count += qty if cat == "tree" else 0
        elif cat == "shrub":
            qty = random.randint(3, max(3, int(area / 15)))
            shrub_count += qty
        else:
            qty = round(area * random.uniform(0.05, 0.20), 1)
            ground_cover_area += qty

        price = PLANT_UNIT_COST.get(cat, 20) * random.uniform(0.8, 1.2)
        unit_prices.append(price)
        plants_cost += qty * price
        total_units += qty
        species_count += 1

    avg_price = float(np.mean(unit_prices)) if unit_prices else 0.0
    return {
        "plants_cost": plants_cost,
        "species_count": species_count,
        "total_units": total_units,
        "avg_unit_price": avg_price,
        "tree_species_count": tree_count,
        "shrub_species_count": shrub_count,
        "ground_cover_area": ground_cover_area,
    }


def generate_sample(idx: int) -> dict:
    project_type = random.choice(["residential", "commercial", "public"])
    area         = round(random.uniform(80, 2100), 1)
    region       = random.choice(["tunis", "sfax", "sousse", "bizerte", "gabes"])
    season       = random.choice(["spring", "summer", "autumn", "winter"])
    n_species    = random.randint(3, 12)

    pl = make_plant_list(n_species, area, project_type)

    base          = BASE_COST_PER_M2[project_type] * area
    season_mult   = SEASON_MULTIPLIER[season]
    region_mult   = REGION_MULTIPLIER[region]

    plants_cost   = pl["plants_cost"]

    # Soil: 15-25% of base depending on area
    soil_volume   = round(area * random.uniform(0.08, 0.18), 2)
    soil_cost     = soil_volume * random.uniform(85, 140)   # TND/m³

    # Labour: 30-40% of base
    labour_days   = max(3, int(area / random.uniform(15, 30)))
    labour_cost   = labour_days * random.uniform(120, 200)

    # Equipment: 8-15% of base
    equipment_qty = random.randint(1, max(1, int(area / 200)))
    equip_cost    = equipment_qty * random.uniform(300, 800)

    # Logistics: flat 3-8% of subtotal
    subtotal      = plants_cost + soil_cost + labour_cost + equip_cost
    logistics     = subtotal * random.uniform(0.03, 0.08)

    total_cost    = (plants_cost + soil_cost + labour_cost + equip_cost + logistics)
    total_cost   *= season_mult * region_mult
    # Add 5-15% noise to simulate real-world variance
    total_cost   *= random.uniform(0.90, 1.15)
    total_cost    = round(total_cost, 3)

    return {
        # ── Target ────────────────────────────────────────────────────────────
        "total_cost": total_cost,
        # ── Features ──────────────────────────────────────────────────────────
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
        "plant_species_count":    pl["species_count"],
        "total_plant_units":      pl["total_units"],
        "avg_plant_unit_price":   round(pl["avg_unit_price"], 3),
        "tree_species_count":     pl["tree_species_count"],
        "shrub_species_count":    pl["shrub_species_count"],
        "ground_cover_area":      round(pl["ground_cover_area"], 2),
        "soil_volume_m3":         soil_volume,
        "equipment_count":        equipment_qty,
        "labor_days":             labour_days,
        # ── Cost breakdown (saved to CSV for reference, not used as features) ─
        "_plants_cost":    round(plants_cost, 3),
        "_soil_cost":      round(soil_cost, 3),
        "_labour_cost":    round(labour_cost, 3),
        "_equip_cost":     round(equip_cost, 3),
        "_logistics_cost": round(logistics, 3),
        "_project_type":   project_type,
        "_region":         region,
        "_season":         season,
    }


def build_dataset(n: int = 200) -> pd.DataFrame:
    samples = [generate_sample(i) for i in range(n)]
    return pd.DataFrame(samples)


# ─── Feature columns (must match predict.py exactly) ──────────────────────────

FEATURE_COLS = [
    "project_type_residential", "project_type_commercial", "project_type_public",
    "site_area_m2",
    "region_tunis", "region_sfax", "region_sousse", "region_bizerte", "region_gabes",
    "season_spring", "season_summer", "season_autumn", "season_winter",
    "plant_species_count", "total_plant_units", "avg_plant_unit_price",
    "tree_species_count", "shrub_species_count", "ground_cover_area",
    "soil_volume_m3", "equipment_count", "labor_days",
]


# ─── Train ─────────────────────────────────────────────────────────────────────

def main():
    print("Generating 200 synthetic training samples...")
    df = build_dataset(200)

    # Save CSV for reference
    df.to_csv(CSV_PATH, index=False)
    print(f"Training CSV saved to {CSV_PATH}")

    X = df[FEATURE_COLS].values
    y = df["total_cost"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    # Scale features
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    # Train XGBoost
    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=0,
    )
    model.fit(
        X_train_s, y_train,
        eval_set=[(X_test_s, y_test)],
        verbose=False,
    )

    y_pred = model.predict(X_test_s)
    rmse   = math.sqrt(mean_squared_error(y_test, y_pred))
    r2     = r2_score(y_test, y_pred)

    print(f"\nTest set metrics (n={len(y_test)}):")
    print(f"  RMSE : {rmse:,.0f} TND")
    print(f"  R2   : {r2:.4f}")

    # Save artifacts
    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    print(f"\nModel  -> {MODEL_PATH}")
    print(f"Scaler -> {SCALER_PATH}")
    print("\nTraining complete.")


if __name__ == "__main__":
    main()

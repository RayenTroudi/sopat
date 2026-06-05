"""
SOPAT Budget Prediction Model — Retrain Script
Retrains on the existing training CSV (augmented with any new data appended to it).
Writes updated model artifacts and a metadata JSON with metrics.

Usage: python scripts/retrain_model.py
Triggered from: /api/ml/retrain (via child_process)
"""

import os
import sys
import json
import math
from pathlib import Path
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import xgboost as xgb

REPO_ROOT   = Path(__file__).parent.parent
MODELS_DIR  = REPO_ROOT / "models"
DATA_DIR    = REPO_ROOT / "data" / "training"
MODELS_DIR.mkdir(exist_ok=True)

MODEL_PATH    = MODELS_DIR / "sopat_budget_v1.joblib"
SCALER_PATH   = MODELS_DIR / "feature_scaler.joblib"
METADATA_PATH = MODELS_DIR / "model_metadata.json"
CSV_PATH      = DATA_DIR / "sopat_projects_2021_2026.csv"

FEATURE_COLS = [
    "project_type_residential", "project_type_commercial", "project_type_public",
    "site_area_m2",
    "region_tunis", "region_sfax", "region_sousse", "region_bizerte", "region_gabes",
    "season_spring", "season_summer", "season_autumn", "season_winter",
    "plant_species_count", "total_plant_units", "avg_plant_unit_price",
    "tree_species_count", "shrub_species_count", "ground_cover_area",
    "soil_volume_m3", "equipment_count", "labor_days",
]


def emit(msg: str):
    """Write a progress line to stdout (flushed immediately)."""
    print(msg, flush=True)


def load_version() -> str:
    """Read current version from metadata to increment it."""
    if METADATA_PATH.exists():
        try:
            meta = json.loads(METADATA_PATH.read_text())
            parts = meta.get("model_version", "v1.0").lstrip("v").split(".")
            major, minor = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
            return f"v{major}.{minor + 1}"
        except Exception:
            pass
    return "v1.1"


def main():
    emit(json.dumps({"status": "starting", "message": "Chargement des données d'entraînement…"}))

    if not CSV_PATH.exists():
        emit(json.dumps({"status": "error", "message": f"Fichier de données introuvable : {CSV_PATH}"}))
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    # Keep only rows that have all feature columns
    missing = [c for c in FEATURE_COLS + ["total_cost"] if c not in df.columns]
    if missing:
        emit(json.dumps({"status": "error", "message": f"Colonnes manquantes : {missing}"}))
        sys.exit(1)

    df = df.dropna(subset=FEATURE_COLS + ["total_cost"])
    n  = len(df)
    emit(json.dumps({"status": "progress", "message": f"{n} échantillons chargés. Entraînement en cours…"}))

    X = df[FEATURE_COLS].values
    y = df["total_cost"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

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
    model.fit(X_train_s, y_train, eval_set=[(X_test_s, y_test)], verbose=False)

    y_pred = model.predict(X_test_s)
    rmse   = math.sqrt(mean_squared_error(y_test, y_pred))
    r2     = r2_score(y_test, y_pred)

    emit(json.dumps({"status": "progress", "message": f"Métriques — RMSE: {rmse:,.0f} TND, R²: {r2:.4f}. Sauvegarde…"}))

    joblib.dump(model,  MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)

    new_version = load_version()
    metadata = {
        "model_version":   new_version,
        "training_date":   datetime.now(timezone.utc).isoformat(),
        "training_samples": n,
        "rmse":            round(rmse, 2),
        "r2":              round(r2, 4),
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2))

    emit(json.dumps({
        "status":   "done",
        "message":  f"Réentraînement terminé — {new_version}",
        "metadata": metadata,
    }))


if __name__ == "__main__":
    main()

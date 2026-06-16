import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

class AsteroidData(BaseModel):
    model_type: str
    absolute_magnitude: float
    estimated_diameter_min: float
    estimated_diameter_max: float
    relative_velocity: float
    miss_distance: float

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rf_model = joblib.load("models/random_forest.pkl")
lgbm_model = joblib.load("models/lightgbm.pkl")
xgb_model = joblib.load("models/xgboost.pkl")
ensemble_model = joblib.load("models/ensemble.pkl")


@app.post("/predict")
async def predict_hazard(data: AsteroidData):
    input_data = pd.DataFrame([{
        "absolute_magnitude": data.absolute_magnitude,
        "estimated_diameter_min": data.estimated_diameter_min,
        "estimated_diameter_max": data.estimated_diameter_max,
        "relative_velocity": data.relative_velocity,
        "miss_distance": data.miss_distance
    }])

    if data.model_type == "Random Forest":
        model = rf_model
    elif data.model_type == "LightGBM":
        model = lgbm_model
    elif data.model_type == "XGBoost":
        model = xgb_model
    elif data.model_type == "Ensemble":
        model = ensemble_model
    else:
        return {"error": "Unknown model"}

    probs = model.predict_proba(input_data)[0]
    hazard_prob = probs[1] * 100
    confidence = max(probs) * 100
    prediction = model.predict(input_data)[0]

    return {
        "status": "success",
        "hazard_prob": round(float(hazard_prob), 2),
        "confidence": round(float(confidence), 2),
        "is_hazardous": bool(prediction)
    }

@app.get("/")
def home():
    return {"message": "NeoCast backend running!"}
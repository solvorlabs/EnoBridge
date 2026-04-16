"""
EnoBridge AI Monitoring Service
Fast API service for AI-powered transaction analysis
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import numpy as np
from datetime import datetime, timedelta
import os

app = FastAPI(
    title="EnoBridge AI Service",
    description="AI-powered monitoring and analysis for EnoBridge",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key authentication
API_KEY = os.getenv("AI_SERVICE_API_KEY", "development_key")

def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key

# Models
class TransactionData(BaseModel):
    txHash: str
    type: str
    amount: str
    sender: str
    recipient: str
    timestamp: str
    gasUsed: str
    gasPrice: str

class AnalysisResult(BaseModel):
    anomalyScore: float
    riskScore: float
    isAnomaly: bool
    isHighRisk: bool
    patterns: List[str]
    recommendation: str
    analysis: Dict[str, Any]

class GasPrediction(BaseModel):
    chain: int
    current: Dict[str, Any]
    predictions: List[Dict[str, Any]]

class Pattern(BaseModel):
    type: str
    count: int
    description: str
    lastSeen: str

# In-memory storage (in production, use a database)
transaction_history = []
gas_price_history = []

# Anomaly Detection (simplified - in production, use trained models)
def detect_anomaly(tx_data: TransactionData) -> tuple:
    """
    Simple anomaly detection based on statistical analysis
    In production, use Isolation Forest or LSTM models
    """
    try:
        amount = float(tx_data.amount)

        # Get historical amounts
        if len(transaction_history) < 10:
            return 0.0, False

        amounts = [float(t.get('amount', 0)) for t in transaction_history if float(t.get('amount', 0)) > 0]
        if not amounts:
            return 0.0, False

        mean = np.mean(amounts)
        std = np.std(amounts)

        if std == 0:
            return 0.0, False

        # Z-score
        z_score = abs((amount - mean) / std)

        # Anomaly score (0-100)
        anomaly_score = min(z_score * 20, 100)

        # Is anomaly if z-score > 3 (3 standard deviations)
        is_anomaly = z_score > 3

        return anomaly_score, is_anomaly

    except Exception as e:
        print(f"Error in anomaly detection: {e}")
        return 0.0, False

# Risk Scoring (simplified)
def calculate_risk_score(tx_data: TransactionData) -> tuple:
    """
    Calculate risk score based on multiple factors
    In production, use Gradient Boosting Classifier
    """
    try:
        risk_score = 0.0

        # Factor 1: Amount (high amounts = higher risk)
        amount = float(tx_data.amount)
        if amount > 1000:
            risk_score += 30
        elif amount > 100:
            risk_score += 15

        # Factor 2: Time of day (unusual hours = higher risk)
        try:
            tx_time = datetime.fromisoformat(tx_data.timestamp.replace('Z', '+00:00'))
            hour = tx_time.hour
            if hour < 6 or hour > 22:  # Late night/early morning
                risk_score += 15
        except:
            pass

        # Factor 3: New addresses (simplified - check if we've seen this address)
        sender_history = [t for t in transaction_history if t.get('sender') == tx_data.sender]
        if len(sender_history) == 0:
            risk_score += 20
        elif len(sender_history) < 5:
            risk_score += 10

        # Factor 4: Rapid transactions (velocity check)
        recent_sender_txs = [t for t in transaction_history[-20:] if t.get('sender') == tx_data.sender]
        if len(recent_sender_txs) > 5:
            risk_score += 20

        risk_score = min(risk_score, 100)
        is_high_risk = risk_score > 70

        return risk_score, is_high_risk

    except Exception as e:
        print(f"Error in risk scoring: {e}")
        return 0.0, False

# Pattern Recognition
def identify_patterns(tx_data: TransactionData) -> List[str]:
    """
    Identify transaction patterns
    """
    patterns = []

    try:
        amount = float(tx_data.amount)

        # Whale activity
        if amount > 1000:
            patterns.append("whale_activity")

        # Rapid transactions
        recent_sender_txs = [t for t in transaction_history[-10:] if t.get('sender') == tx_data.sender]
        if len(recent_sender_txs) >= 3:
            patterns.append("rapid_transactions")

        # Regular user
        if len(recent_sender_txs) >= 1 and amount < 100:
            patterns.append("regular_user")

        # Round amounts (potential test transactions)
        if amount % 10 == 0:
            patterns.append("round_amount")

    except:
        pass

    return patterns if patterns else ["normal"]

# Endpoints

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "EnoBridge AI Service",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_transaction(tx_data: TransactionData, api_key: str = Header(None, alias="X-API-Key")):
    """
    Analyze a transaction with AI models
    """
    # For development, allow without API key
    # verify_api_key(api_key)

    # Store transaction
    transaction_history.append(tx_data.dict())

    # Keep only last 1000 transactions
    if len(transaction_history) > 1000:
        transaction_history.pop(0)

    # Run analysis
    anomaly_score, is_anomaly = detect_anomaly(tx_data)
    risk_score, is_high_risk = calculate_risk_score(tx_data)
    patterns = identify_patterns(tx_data)

    # Determine recommendation
    if is_anomaly and is_high_risk:
        recommendation = "Block and investigate"
    elif is_anomaly or is_high_risk:
        recommendation = "Monitor closely"
    else:
        recommendation = "Approve"

    # Additional analysis
    analysis = {
        "amountDeviation": float(anomaly_score / 20) if anomaly_score > 0 else 0,
        "velocityCheck": "high" if "rapid_transactions" in patterns else "normal",
        "addressReputation": "new" if risk_score > 70 else "good",
        "timeAnalysis": "unusual_hours" if risk_score > 50 else "typical_hours"
    }

    return AnalysisResult(
        anomalyScore=round(anomaly_score, 2),
        riskScore=round(risk_score, 2),
        isAnomaly=is_anomaly,
        isHighRisk=is_high_risk,
        patterns=patterns,
        recommendation=recommendation,
        analysis=analysis
    )

@app.get("/api/metrics")
async def get_metrics(timeRange: str = "24h"):
    """
    Get real-time metrics
    """
    # Calculate metrics from transaction history
    now = datetime.utcnow()

    time_delta = {
        "1h": timedelta(hours=1),
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30)
    }.get(timeRange, timedelta(hours=24))

    cutoff_time = now - time_delta

    # Filter recent transactions
    recent_txs = [
        t for t in transaction_history
        if datetime.fromisoformat(t['timestamp'].replace('Z', '+00:00')) > cutoff_time
    ]

    total_volume = sum(float(t.get('amount', 0)) for t in recent_txs)
    unique_users = len(set(t['sender'] for t in recent_txs))

    # Count anomalies (simplified)
    anomalies = sum(1 for t in recent_txs if float(t.get('amount', 0)) > 1000)

    return {
        "timeRange": timeRange,
        "metrics": {
            "totalTransactions": len(recent_txs),
            "totalVolume": f"{total_volume:.2f}",
            "activeUsers": unique_users,
            "successRate": 99.2,
            "averageGasCost": "0.003",
            "anomaliesDetected": anomalies,
            "highRiskTransactions": anomalies
        }
    }

@app.get("/api/gas-prediction")
async def predict_gas_price(chain: int, horizon: int = 30):
    """
    Predict gas prices (simplified - in production, use ARIMA + LSTM)
    """
    # Simple prediction: current price ± random variation
    current_base_fee = "50000000000"  # 50 Gwei
    current_priority_fee = "2000000000"  # 2 Gwei

    predictions = []
    for i in range(1, horizon // 15 + 1):
        # Simulate decreasing gas price over time
        predicted_base_fee = int(float(current_base_fee) * (0.95 + np.random.random() * 0.1))
        confidence = 0.9 - (i * 0.1)

        predictions.append({
            "time": (datetime.utcnow() + timedelta(minutes=i * 15)).isoformat(),
            "baseFee": str(predicted_base_fee),
            "confidence": max(confidence, 0.5)
        })

    return {
        "chain": chain,
        "current": {
            "baseFee": current_base_fee,
            "priorityFee": current_priority_fee,
            "timestamp": datetime.utcnow().isoformat()
        },
        "predictions": predictions
    }

@app.get("/api/patterns")
async def get_patterns():
    """
    Get detected patterns
    """
    # Simple pattern detection from recent transactions
    recent_txs = transaction_history[-100:] if len(transaction_history) > 100 else transaction_history

    whale_count = sum(1 for t in recent_txs if float(t.get('amount', 0)) > 1000)
    rapid_count = len([t['sender'] for t in recent_txs if recent_txs.count(t) > 3])

    patterns = []

    if whale_count > 0:
        patterns.append({
            "type": "whale_activity",
            "count": whale_count,
            "description": "Large transfers detected",
            "lastSeen": datetime.utcnow().isoformat()
        })

    if rapid_count > 0:
        patterns.append({
            "type": "rapid_transactions",
            "count": rapid_count,
            "description": "Multiple transactions from same address",
            "lastSeen": datetime.utcnow().isoformat()
        })

    return {"patterns": patterns}

if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

"""
VisionaryX — AI Car Price Calculator
Flask server powering the redesigned premium web interface.
"""
from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import pickle
import os

app = Flask(__name__, static_folder='static', static_url_path='/static')

# Port from environment (Render sets this automatically)
PORT = int(os.environ.get('PORT', 5000))

# ─── Load ML Model ───────────────────────────────────────────────
model = None
try:
    model_path = os.path.join(os.path.dirname(__file__), 'best_rf_model.pkl')
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    print("[OK] VisionaryX model loaded successfully")
except Exception as e:
    print(f"[ERROR] Model load error: {e}")


# ─── Routes ──────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded. Run car_price_prediction.py first.'}), 500

    try:
        data = request.json
        original_price = float(data['original_price'])
        year = int(data['year'])
        car_age = 2026 - year

        input_data = pd.DataFrame({
            'Brand': [data['brand']],
            'Model': [data['model']],
            'variant': [data['variant']],
            'condition': [data['condition']],
            'city': [data['city']],
            'fuel': [data['fuel']],
            'transmission': [data['transmission']],
            'owner': [data['owner']],
            'mileage': [float(data['mileage'])],
            'engine': [int(data['engine'])],
            'max_power': [int(data['max_power'])],
            'seats': [str(data['seats'])],
            'km_driven': [int(data['km_driven'])],
            'car_age': [car_age],
            'Original_Price': [original_price]
        })

        raw_pred = float(model.predict(input_data)[0])
        final_pred = raw_pred

        # ── Domain Knowledge: Premium SUV boost ──
        indian_premium_suvs = ['Creta', 'Fortuner', 'Innova', 'Scorpio', 'Thar', 'XUV700']
        is_premium_suv = data['model'] in indian_premium_suvs
        if is_premium_suv:
            final_pred *= 1.15

        # ── Sanity Caps ──
        min_allowed = original_price * 0.30
        max_allowed = original_price * 0.90
        safety_cap = None
        if final_pred < min_allowed:
            final_pred = min_allowed + (original_price * 0.05)
            safety_cap = 'floor'
        elif final_pred > max_allowed:
            final_pred = max_allowed - (original_price * 0.05)
            safety_cap = 'ceiling'

        depreciation_pct = max(((original_price - final_pred) / original_price) * 100, 0)

        # ── Smart Tags ──
        tags = []
        if data['city'].startswith('Metro'):
            tags.append('Metro Boost')
        if data['fuel'] == 'CNG':
            tags.append('CNG Economy')
        elif data['fuel'] == 'Diesel':
            tags.append('Diesel Torque')
        if is_premium_suv:
            tags.append('Premium SUV')
        if data['owner'] == 'First Owner':
            tags.append('1st Owner Advantage')
        if data['transmission'] == 'Automatic':
            tags.append('AT Premium')
        if int(data['engine']) >= 1500:
            tags.append('Power Plant')
        if car_age <= 2:
            tags.append('Nearly New')
        if int(data['km_driven']) < 20000:
            tags.append('Low Mileage Gem')
        if int(data.get('airbags', 0)) >= 6:
            tags.append('Safety Star')
        if data['fuel'] == 'CNG' or (float(data['mileage']) >= 22):
            tags.append('Eco Friendly')

        # ── Market Score (0–100) ──
        score = 50
        if is_premium_suv:
            score += 15
        if data['owner'] == 'First Owner':
            score += 10
        elif data['owner'] == 'Second Owner':
            score += 5
        if data['condition'] == 'Excellent':
            score += 15
        elif data['condition'] == 'Good':
            score += 10
        elif data['condition'] == 'Fair':
            score += 5
        if car_age <= 3:
            score += 10
        elif car_age <= 5:
            score += 5
        if data['city'].startswith('Metro'):
            score += 5
        if int(data['km_driven']) < 30000:
            score += 5
        score = min(score, 98)

        # ── Confidence ──
        if depreciation_pct < 50 and score > 60:
            confidence = 'High'
        elif score > 40:
            confidence = 'Medium'
        else:
            confidence = 'Low'

        # Round to nearest 1000 for clean, realistic prices
        final_pred = round(final_pred / 1000) * 1000

        return jsonify({
            'predicted_price': final_pred,
            'depreciation': round(depreciation_pct, 1),
            'range_low': round((final_pred * 0.95) / 1000) * 1000,
            'range_high': round((final_pred * 1.05) / 1000) * 1000,
            'is_premium_suv': is_premium_suv,
            'safety_cap': safety_cap,
            'car_age': car_age,
            'original_price': original_price,
            'tags': tags,
            'market_score': score,
            'confidence': confidence
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print(f"\n>>> VisionaryX Server starting on http://localhost:{PORT}\n")
    app.run(host='0.0.0.0', port=PORT, debug=True)

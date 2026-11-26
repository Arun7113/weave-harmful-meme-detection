# ═══════════════════════════════════════════════════════════════════
# FLASK BACKEND — Hateful Meme Detector API
# Run this in your Kaggle notebook with ngrok to expose the endpoint
# ═══════════════════════════════════════════════════════════════════
#
# SETUP IN KAGGLE (add a new cell at the bottom of your notebook):
#
#   !pip install flask flask-cors pyngrok -q
#   !ngrok config add-authtoken YOUR_NGROK_TOKEN
#   exec(open('/kaggle/input/.../app.py').read())
#
# OR just paste the contents directly into a Kaggle cell.
# ═══════════════════════════════════════════════════════════════════

from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
import threading, io, requests as req_lib
from PIL import Image as PILImage

app = Flask(__name__)
CORS(app)  # Allow requests from Chrome extension

# ── Health check ─────────────────────────────────────────────────────
@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok", "model": "HateClassifier-WebCtx"})


# ── Main inference endpoint ───────────────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict_endpoint():
    """
    Accepts JSON: { "image_url": "https://..." }
    Returns JSON: { "label": "HATEFUL"|"NOT HATEFUL",
                    "prob": 0.82, "confidence": 0.82,
                    "ocr_text": "...", "hateful": true }
    """
    data = request.get_json(force=True)
    image_url = data.get("image_url", "").strip()

    if not image_url:
        return jsonify({"error": "No image_url provided"}), 400

    try:
        # Use your existing predict() function from the notebook
        result = predict(image_url, threshold=THRESHOLD, verbose=False)
        return jsonify({
            "label":      result["label"],
            "prob":       round(result["prob"], 4),
            "confidence": round(result["confidence"], 4),
            "ocr_text":   result["full_text"],
            "hateful":    result["pred"] == 1,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Start server + ngrok tunnel ───────────────────────────────────────
def start_server():
    # Kill any existing ngrok tunnels
    ngrok.kill()

    # Open tunnel on port 5000
    public_url = ngrok.connect(5000, bind_tls=True)
    print("\n" + "="*60)
    print(f"  🌐 Public API URL: {public_url}")
    print(f"  📋 Copy this into extension/config.js:")
    print(f"     const API_URL = \"{public_url}\";")
    print("="*60 + "\n")

    # Run Flask in a background thread (so Kaggle cell doesn't block)
    t = threading.Thread(target=lambda: app.run(port=5000, use_reloader=False))
    t.daemon = True
    t.start()
    return public_url

# Call this after your model is loaded:
# public_url = start_server()

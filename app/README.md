# 🛡️ Hateful Meme Shield — Chrome Extension

Detects and blurs hateful memes on social media in real-time using your 4-modal AI model.

---

## Architecture

```
Social Media Page
      │
      ▼
Chrome Extension (content.js)
  • Finds all <img> tags
  • Sends image URLs to your API
      │
      ▼ HTTP POST /predict
Flask API  ◄─── running in Kaggle notebook via ngrok
  • Calls your predict() function
  • Returns { hateful, prob, label, ocr_text }
      │
      ▼
Extension blurs hateful images + shows badge
```

---

## Step 1 — Start the backend in Kaggle

Add this cell **at the bottom** of your inference notebook (after model is loaded):

```python
# Install server deps
!pip install flask flask-cors pyngrok -q

# Paste your ngrok authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
!ngrok config add-authtoken YOUR_NGROK_AUTHTOKEN_HERE

# Copy app.py contents here OR:
import urllib.request
# paste the app.py code directly below:

from flask import Flask, request, jsonify
from flask_cors import CORS
from pyngrok import ngrok
import threading

app = Flask(__name__)
CORS(app)

@app.route("/ping")
def ping():
    return {"status": "ok"}

@app.route("/predict", methods=["POST"])
def predict_endpoint():
    data = request.get_json(force=True)
    url  = data.get("image_url", "")
    if not url:
        return {"error": "No image_url"}, 400
    try:
        result = predict(url, threshold=THRESHOLD, verbose=False)
        return {
            "label":      result["label"],
            "prob":       round(result["prob"], 4),
            "confidence": round(result["confidence"], 4),
            "ocr_text":   result["full_text"],
            "hateful":    result["pred"] == 1,
        }
    except Exception as e:
        return {"error": str(e)}, 500

ngrok.kill()
public_url = ngrok.connect(5000, bind_tls=True).public_url
print(f"\n✅ API live at: {public_url}\n")
print(f"   Paste into extension config.js:\n   const API_URL = \"{public_url}\";\n")

t = threading.Thread(target=lambda: app.run(port=5000, use_reloader=False))
t.daemon = True
t.start()
```

Copy the printed `https://xxxx.ngrok-free.app` URL.

---

## Step 2 — Configure the extension

Open `extension/config.js` and paste your ngrok URL:

```js
const API_URL = "https://xxxx.ngrok-free.app";  // ← your URL here
```

---

## Step 3 — Load the extension in Chrome

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. The 🛡️ icon appears in your toolbar

---

## Step 4 — Test it

1. Go to Twitter/X, Facebook, Reddit, Instagram, or Tumblr
2. Watch images get automatically checked
3. Hateful memes get blurred with a red **🚨 HATEFUL XX%** badge
4. Hover over a blurred image to soft-preview
5. Click the reveal button to fully unblur

---

## Popup features

Click the 🛡️ icon to see:
- **API status** (green = connected)
- **Images scanned** count
- **Hateful blurred** count  
- Update the ngrok URL without editing files

---

## Files

```
extension/
├── manifest.json      Chrome extension config
├── config.js          API URL + settings
├── content.js         Image scanning + blurring logic
├── popup.html         Extension popup UI
├── popup.js           Popup logic
└── icons/             Extension icons (16/48/128px)

backend/
└── app.py             Flask API wrapper (paste into Kaggle)
```

---

## Tips for demo

- Use **Twitter/X** — images load as direct URLs, works best
- Reddit image posts also work well
- Facebook may block external image requests (CORS) — use others
- Keep the Kaggle notebook running during the demo
- ngrok free tier has a request limit; restart if it stops

---

## Model pipeline shown to judges

Each image URL goes through:
1. **Download** → PIL Image
2. **EasyOCR** → words + bounding boxes  
3. **CLIP ViT-L/14** → visual features + CLIP text tokens
4. **TextualInversion** → phi-enhanced text features
5. **LiLT + LoRA** → layout-aware document features
6. **Web Context Branch** → contextual embeddings
7. **QuadModal Fusion** → gated combination of all 4 streams
8. **Sigmoid head** → P(hateful)

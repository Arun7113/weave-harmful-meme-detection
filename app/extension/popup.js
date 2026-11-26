// popup.js — Hateful Meme Shield popup logic

const dot        = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const apiInput   = document.getElementById("apiUrl");
const saveBtn    = document.getElementById("saveBtn");
const totalEl    = document.getElementById("totalCount");
const hatefulEl  = document.getElementById("hatefulCount");

// ── Load saved URL ────────────────────────────────────────────────────
chrome.storage.local.get(["apiUrl", "stats"], (data) => {
  if (data.apiUrl) apiInput.value = data.apiUrl;
  if (data.stats) {
    totalEl.textContent   = data.stats.total   ?? "0";
    hatefulEl.textContent = data.stats.hateful ?? "0";
  } else {
    totalEl.textContent   = "0";
    hatefulEl.textContent = "0";
  }
  checkApi(data.apiUrl || apiInput.value);
});

// ── Check if API is reachable ─────────────────────────────────────────
async function checkApi(url) {
  if (!url || !url.startsWith("http")) {
    setStatus("orange", "No API URL set");
    return;
  }
  setStatus("orange", "Connecting...");
  try {
    const resp = await fetch(`${url}/ping`, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      setStatus("green", "API connected ✓");
    } else {
      setStatus("red", `API error ${resp.status}`);
    }
  } catch {
    setStatus("red", "Cannot reach API — is ngrok running?");
  }
}

function setStatus(color, text) {
  dot.className = `dot ${color}`;
  statusText.textContent = text;
}

// ── Save button ───────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const url = apiInput.value.trim().replace(/\/$/, "");
  if (!url.startsWith("http")) {
    setStatus("red", "Enter a valid https:// URL");
    return;
  }
  chrome.storage.local.set({ apiUrl: url }, () => {
    saveBtn.textContent = "Saved ✓";
    setTimeout(() => saveBtn.textContent = "Save & Reconnect", 1500);
    checkApi(url);
    // Tell content script the URL changed
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_API_URL", url });
      }
    });
  });
});

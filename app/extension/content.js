const processed = new Set();

// ── Styles ────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  .hms-wrapper {
    position: relative !important;
    display: inline-block !important;
    line-height: 0 !important;
  }
  .hms-wrapper img.hms-blurred {
    filter: blur(12px) !important;
    transform: scale(1) !important;
  }
  .hms-wrapper:hover img.hms-blurred {
    filter: blur(3px) !important;
  }
  .hms-badge {
    position: absolute !important;
    top: 8px !important;
    left: 8px !important;
    background: #d62728 !important;
    color: #fff !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    font-family: Arial, sans-serif !important;
    padding: 4px 10px !important;
    border-radius: 20px !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
  }
  .hms-reveal-btn {
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    background: rgba(0,0,0,0.8) !important;
    color: #fff !important;
    border: 2px solid white !important;
    border-radius: 20px !important;
    padding: 8px 16px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    z-index: 2147483647 !important;
    white-space: nowrap !important;
    font-family: Arial, sans-serif !important;
  }
  .hms-reveal-btn:hover {
    background: rgba(0,0,0,0.95) !important;
  }
`;
document.head.appendChild(style);

// ── API call ──────────────────────────────────────────────────────
async function checkImage(imageUrl) {
  const resp = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  return resp.json();
}

// ── Apply blur ────────────────────────────────────────────────────
function applyBlur(img, result) {
  if (img.closest(".hms-wrapper")) return;

  const parent  = img.parentNode;
  const wrapper = document.createElement("div");
  wrapper.className = "hms-wrapper";

  // Match exact image dimensions
  const w = img.offsetWidth  || img.naturalWidth  || 200;
  const h = img.offsetHeight || img.naturalHeight || 200;
  wrapper.style.cssText = `
    width: ${w}px !important;
    height: ${h}px !important;
    overflow: hidden !important;
    display: inline-block !important;
    position: relative !important;
  `;

  parent.insertBefore(wrapper, img);
  wrapper.appendChild(img);

  // Apply blur directly on the img
  img.style.cssText += `
    filter: blur(12px) !important;
    display: block !important;
    width: ${w}px !important;
    height: ${h}px !important;
    object-fit: cover !important;
  `;
  img.classList.add("hms-blurred");

  // Badge
  const badge = document.createElement("div");
  badge.className   = "hms-badge";
  badge.textContent = `🚨 HATEFUL ${Math.round(result.prob * 100)}%`;
  wrapper.appendChild(badge);

  // Reveal button — centered on image
  const btn = document.createElement("button");
  btn.className   = "hms-reveal-btn";
  btn.textContent = "👁 Click to Reveal";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Remove blur
    img.style.filter = "none";
    img.classList.remove("hms-blurred");
    badge.remove();
    btn.remove();
    console.log("[HatefulMemeShield] Revealed by user");
  });
  wrapper.appendChild(btn);

  console.log(`[HatefulMemeShield] 🚨 Blurred: prob=${result.prob} — ${img.src.slice(0,80)}`);
}

// ── Process image ─────────────────────────────────────────────────
async function processImage(img) {
  const src = img.src
    || img.dataset.src
    || img.getAttribute("data-original")
    || "";

  if (!src || !src.startsWith("http")) return;
  if (src.startsWith("data:") || src.startsWith("blob:")) return;
  if (processed.has(src)) return;
  if (img.naturalWidth  < MIN_IMAGE_WIDTH)  return;
  if (img.naturalHeight < MIN_IMAGE_HEIGHT) return;
  if (img.closest(".hms-wrapper")) return;

  processed.add(src);
  console.log(`[HatefulMemeShield] Checking: ${src.slice(0,100)}`);

  try {
    const result = await checkImage(src);
    console.log(`[HatefulMemeShield] →`, result);
    if (result.hateful) applyBlur(img, result);
  } catch (e) {
    processed.delete(src);
    console.warn(`[HatefulMemeShield] Error:`, e.message);
  }
}

// ── Scan + observe ────────────────────────────────────────────────
function scanPage() {
  document.querySelectorAll("img").forEach(img => {
    if (img.complete && img.naturalWidth >= MIN_IMAGE_WIDTH) {
      processImage(img);
    } else {
      img.addEventListener("load", () => processImage(img), { once: true });
    }
  });
}

new MutationObserver(mutations => {
  mutations.forEach(m => {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.tagName === "IMG") processImage(node);
      node.querySelectorAll?.("img").forEach(processImage);
    });
  });
}).observe(document.body, { childList: true, subtree: true });

scanPage();
setInterval(scanPage, SCAN_INTERVAL_MS);
console.log(`[HatefulMemeShield] 🛡️ Active — ${API_URL}`);
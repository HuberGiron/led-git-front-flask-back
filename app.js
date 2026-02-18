//const API_BASE = "http://172.22.129.142:5000"; // IP de tu PC / servidor backend
// o "http://127.0.0.1:5000" o "http://localhost:5000" si el front corre en la misma PC y solo lo usas en ese navegador

const API_BASE = "http://led-git-front-flask-back-docker.onrender.com:10000"; // Servidor render

const elColor = document.getElementById("color"); 
const elHex = document.getElementById("colorHex");
const elCount = document.getElementById("count");
const elCountLabel = document.getElementById("countLabel");
const elStrip = document.getElementById("strip");
const elBadge = document.getElementById("netBadge");
const elRev = document.getElementById("rev");
const elUpdatedAt = document.getElementById("updatedAt");

const btnOff = document.getElementById("btnOff");
const btnSave = document.getElementById("btnSave");

let current = { color: "#ff0000", count: 8, rev: null, updated_at: null };
let sendTimer = null;

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function renderPreview() {
  elHex.textContent = current.color.toLowerCase();
  elCountLabel.textContent = String(current.count);

  elStrip.innerHTML = "";
  for (let i = 0; i < 8; i++) {
    const d = document.createElement("div");
    d.className = "led";
    if (i < current.count) d.style.background = current.color;
    elStrip.appendChild(d);
  }

  elRev.textContent = current.rev ?? "—";
  elUpdatedAt.textContent = current.updated_at ? new Date(current.updated_at).toLocaleString() : "—";
}

function setBadge(ok, text) {
  elBadge.textContent = text;
  elBadge.style.borderColor = ok ? "rgba(100,255,180,.25)" : "rgba(255,120,120,.25)";
  elBadge.style.background = ok ? "rgba(100,255,180,.10)" : "rgba(255,120,120,.10)";
}

async function loadState() {
  try {
    const r = await fetch(`${API_BASE}/api/state`, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const st = await r.json();
    current.color = st.color;
    current.count = clamp(parseInt(st.count, 10) || 0, 0, 8);
    current.rev = st.rev ?? null;
    current.updated_at = st.updated_at ?? null;

    elColor.value = current.color;
    elCount.value = current.count;

    renderPreview();
    setBadge(true, "Conectado");
  } catch (e) {
    setBadge(false, "Sin conexión");
  }
}

async function saveState() {
  try {
    const payload = { color: current.color, count: current.count };
    const r = await fetch(`${API_BASE}/api/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await r.json();
    if (!r.ok) throw new Error(out?.error || `HTTP ${r.status}`);

    current.rev = out.rev ?? current.rev;
    current.updated_at = out.updated_at ?? current.updated_at;

    renderPreview();
    setBadge(true, "Guardado");
  } catch (e) {
    setBadge(false, "Error al guardar");
    console.error(e);
  }
}

// Guarda con debounce (para no spamear el server mientras arrastras el slider)
function scheduleSave(delayMs = 180) {
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => saveState(), delayMs);
}

elColor.addEventListener("input", () => {
  current.color = elColor.value;
  renderPreview();
  scheduleSave();
});

elCount.addEventListener("input", () => {
  current.count = clamp(parseInt(elCount.value, 10) || 0, 0, 8);
  renderPreview();
  scheduleSave();
});

btnOff.addEventListener("click", () => {
  current.count = 0;
  elCount.value = 0;
  renderPreview();
  saveState();
});

btnSave.addEventListener("click", () => saveState());

// init
renderPreview();
loadState();

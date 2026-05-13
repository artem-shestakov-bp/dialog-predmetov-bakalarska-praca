import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore, doc, setDoc, updateDoc, onSnapshot,
  collection, addDoc, serverTimestamp, query, orderBy,
  getDocs, writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// 1) Zmeň tieto údaje podľa Firebase Console → Project settings → Your apps → Web app.
const firebaseConfig = {
  apiKey: "PASTE_API_KEY_HERE",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};

const TEMY = [
  "Čo znamená byť užitočný?","Sloboda alebo bezpečnosť?","Treba vždy poslúchať pravidlá?",
  "Kedy je ticho výrečnejšie než slová?","Čo robí dom domovom?","Ako meriame šťastie?",
  "Kedy je riziko opodstatnené?","Ako vzniká dôvera?","Potrebujeme rutinu?","Čo skrýva ticho?",
  "Čo je dôležitejšie: forma alebo obsah?","Kde končí ja a začína my?","Môžeme byť objektívni?",
  "Ako sa sny menia v čase?","Prečo potrebujeme pravidlá hry?","Kedy je mlčanie lepšie než slová?",
  "Čo je ideálny deň?","Kde je hranica zodpovednosti?","Ako chápeme krásu?","Kedy riskovať má zmysel?"
];
const OBJEKTY = [
  "Stolička","Rúra","Dáždnik","Hodiny","Šálka","Kniha","Mobil","Zrkadlo","Kľúč","Lampa",
  "Bicykel","Vankúš","Ruksak","Ceruzka","Kávovar","Rastlina","Kabát","Fľaša","Vysávač","Toster"
];
const COLORS = ["#4ea1ff", "#ff6fb1", "#7ee787", "#ffd166", "#c77dff", "#ff9f1c", "#64dfdf", "#f28482"];
const $ = (id) => document.getElementById(id);
const choice = (arr, exclude = []) => {
  const blocked = Array.isArray(exclude) ? exclude : [exclude];
  const pool = arr.filter(x => !blocked.includes(x));
  return (pool.length ? pool : arr)[Math.floor(Math.random() * (pool.length ? pool.length : arr.length))];
};
const safeId = () => Math.random().toString(36).slice(2, 10);

const state = {
  online: false,
  db: null,
  roomId: "",
  unsubRoom: null,
  unsubEntries: null,
  tema: "",
  participants: [
    { id: "a", name: "A", object: "Stolička", color: COLORS[0] },
    { id: "b", name: "B", object: "Rúra", color: COLORS[1] }
  ],
  currentSpeakerId: "a",
  entries: []
};

const roomIdEl = $("roomId"), statusEl = $("status"), tema = $("tema"), temaOut = $("temaOut");
const participantsEl = $("participants"), newName = $("newName"), newObject = $("newObject");
const whoSelect = $("whoSelect"), line = $("line"), log = $("log");

function firebaseConfigured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE_") && !firebaseConfig.projectId.includes("PASTE_");
}
function setStatus(text) { statusEl.textContent = text; }
function syncTemaUI() { tema.value = state.tema; temaOut.textContent = state.tema || "—"; }
function currentIndex() { return Math.max(0, state.participants.findIndex(p => p.id === state.currentSpeakerId)); }
function getParticipant(id) { return state.participants.find(p => p.id === id) || state.participants[0]; }

function renderParticipants() {
  participantsEl.innerHTML = "";
  state.participants.forEach((p, index) => {
    const row = document.createElement("div");
    row.className = "participant";
    row.innerHTML = `
      <div class="color-dot" style="background:${p.color}"></div>
      <input aria-label="Meno" value="${escapeAttr(p.name)}" data-role="name" data-id="${p.id}">
      <input aria-label="Predmet" value="${escapeAttr(p.object)}" data-role="object" data-id="${p.id}">
      <button class="btn ghost" data-role="remove" data-id="${p.id}" ${state.participants.length <= 1 ? "disabled" : ""}>✖</button>
    `;
    participantsEl.appendChild(row);
    row.querySelectorAll("input").forEach(input => {
      input.addEventListener("change", async () => {
        const role = input.dataset.role;
        state.participants[index][role] = input.value.trim() || (role === "name" ? `U${index + 1}` : "—");
        await saveRoom();
        renderAll();
      });
    });
    row.querySelector("button").addEventListener("click", async () => {
      state.participants = state.participants.filter(x => x.id !== p.id);
      if (!getParticipant(state.currentSpeakerId)) state.currentSpeakerId = state.participants[0]?.id || "";
      await saveRoom();
      renderAll();
    });
  });
}

function renderWhoSelect() {
  whoSelect.innerHTML = "";
  state.participants.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.object || "bez predmetu"}`;
    whoSelect.appendChild(opt);
  });
  whoSelect.value = state.currentSpeakerId;
}

function renderLog() {
  log.innerHTML = "";
  state.entries.forEach((e, i) => {
    const p = getParticipant(e.speakerId) || { name: e.speakerName || "?", object: "", color: "#ddd" };
    const row = document.createElement("div");
    row.className = "logline";
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.style.background = e.color || p.color;
    badge.textContent = e.speakerName || p.name;
    const content = document.createElement("div");
    content.className = "content";
    content.textContent = e.text;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = e.object || p.object ? `(${e.object || p.object})` : "";
    content.prepend(meta);
    row.appendChild(badge);
    row.appendChild(content);
    log.appendChild(row);
    if (i < state.entries.length - 1) {
      const hr = document.createElement("div");
      hr.className = "hr";
      log.appendChild(hr);
    }
  });
  log.scrollTop = log.scrollHeight;
}
function renderAll() { syncTemaUI(); renderParticipants(); renderWhoSelect(); renderLog(); }
function escapeAttr(str) { return String(str || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"); }

async function saveRoom() {
  if (!state.online) return;
  await setDoc(doc(state.db, "dialogRooms", state.roomId), {
    tema: state.tema,
    participants: state.participants,
    currentSpeakerId: state.currentSpeakerId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}
async function connectRoom() {
  const id = roomIdEl.value.trim();
  if (!id) return alert("Zadaj ID miestnosti.");
  if (!firebaseConfigured()) return alert("Najprv vlož firebaseConfig v súbore script.js.");
  if (!state.db) state.db = getFirestore(initializeApp(firebaseConfig));
  state.roomId = id;
  state.online = true;
  state.unsubRoom?.(); state.unsubEntries?.();
  const roomRef = doc(state.db, "dialogRooms", id);
  await setDoc(roomRef, {
    tema: state.tema || choice(TEMY),
    participants: state.participants,
    currentSpeakerId: state.currentSpeakerId,
    updatedAt: serverTimestamp()
  }, { merge: true });
  state.unsubRoom = onSnapshot(roomRef, snap => {
    const data = snap.data();
    if (!data) return;
    state.tema = data.tema || "";
    state.participants = Array.isArray(data.participants) && data.participants.length ? data.participants : state.participants;
    state.currentSpeakerId = data.currentSpeakerId || state.participants[0]?.id || "";
    setStatus(`Režim: online • miestnosť ${state.roomId}`);
    renderAll();
  }, err => setStatus(`Chyba miestnosti: ${err.message}`));
  state.unsubEntries = onSnapshot(query(collection(state.db, "dialogRooms", id, "entries"), orderBy("createdAt", "asc")), snap => {
    state.entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLog();
  }, err => setStatus(`Chyba replik: ${err.message}`));
}
function goOffline() {
  state.unsubRoom?.(); state.unsubEntries?.();
  state.online = false;
  setStatus("Režim: offline");
}
async function addParticipant() {
  const name = newName.value.trim() || String.fromCharCode(65 + state.participants.length);
  const usedObjects = state.participants.map(p => p.object);
  const object = newObject.value.trim() || choice(OBJEKTY, usedObjects);
  state.participants.push({ id: safeId(), name, object, color: COLORS[state.participants.length % COLORS.length] });
  newName.value = ""; newObject.value = "";
  await saveRoom();
  renderAll();
}
async function pushLine() {
  const txt = line.value.trim();
  if (!txt || !state.participants.length) return;
  const p = getParticipant(state.currentSpeakerId);
  const entry = { speakerId: p.id, speakerName: p.name, object: p.object, color: p.color, text: txt, createdAt: state.online ? serverTimestamp() : new Date() };
  line.value = "";
  if (state.online) await addDoc(collection(state.db, "dialogRooms", state.roomId, "entries"), entry);
  else { state.entries.push(entry); renderLog(); }
  nextSpeaker();
  await saveRoom();
  line.focus();
}
async function nextSpeaker() {
  if (!state.participants.length) return;
  const idx = currentIndex();
  state.currentSpeakerId = state.participants[(idx + 1) % state.participants.length].id;
  renderWhoSelect();
}
async function clearAllEntries() {
  if (!confirm("Vyčistiť celý dialóg?")) return;
  if (state.online) {
    const snap = await getDocs(collection(state.db, "dialogRooms", state.roomId, "entries"));
    const batch = writeBatch(state.db);
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } else {
    state.entries = [];
    renderLog();
  }
}
function downloadTxt() {
  const header = `Dialóg predmetov\nTéma: ${state.tema || "—"}\nÚčastníci:\n${state.participants.map(p => `${p.name}: ${p.object || "—"}`).join("\n")}\n\n`;
  const body = state.entries.map(e => `${e.speakerName || getParticipant(e.speakerId)?.name || "?"}: ${e.text}`).join("\n");
  const blob = new Blob([header + body + "\n"], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dialog-predmetov_${(state.tema || "zaznam").toLowerCase().replace(/[^a-z0-9áäčďéíĺľňóôŕšťúýž_-]+/gi, "-")}.txt`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

$("temaRnd").onclick = async () => { state.tema = choice(TEMY); await saveRoom(); renderAll(); };
tema.addEventListener("input", async () => { state.tema = tema.value; await saveRoom(); syncTemaUI(); });
$("objectRnd").onclick = () => { newObject.value = choice(OBJEKTY, state.participants.map(p => p.object)); };
$("addParticipant").onclick = addParticipant;
$("connectRoom").onclick = connectRoom;
$("offlineMode").onclick = goOffline;
whoSelect.onchange = async () => { state.currentSpeakerId = whoSelect.value; await saveRoom(); };
$("nextSpeaker").onclick = async () => { await nextSpeaker(); await saveRoom(); };
$("addLine").onclick = pushLine;
line.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); pushLine(); } });
$("clearAll").onclick = clearAllEntries;
$("download").onclick = downloadTxt;

function init() {
  state.tema = choice(TEMY);
  roomIdEl.value = location.hash ? decodeURIComponent(location.hash.slice(1)) : "bakalarka-1";
  syncTemaUI();
  renderAll();
  line.focus();
}
init();

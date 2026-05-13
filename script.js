import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIOjW8KaG_9WDcsF0BnwYqr_zp47zN8j4",
  authDomain: "bakalarska-praca-b0f89.firebaseapp.com",
  projectId: "bakalarska-praca-b0f89",
  storageBucket: "bakalarska-praca-b0f89.firebasestorage.app",
  messagingSenderId: "69722305708",
  appId: "1:69722305708:web:cd042b93293b5357705b09"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEMY = [
  "Čo znamená byť užitočný?",
  "Sloboda alebo bezpečnosť?",
  "Treba vždy poslúchať pravidlá?",
  "Kedy je ticho výrečnejšie než slová?",
  "Čo robí dom domovom?",
  "Ako meriame šťastie?",
  "Kedy je riziko opodstatnené?",
  "Ako vzniká dôvera?",
  "Potrebujeme rutinu?",
  "Čo skrýva ticho?",
  "Čo je dôležitejšie: forma alebo obsah?",
  "Kde končí ja a začína my?",
  "Môžeme byť objektívni?",
  "Ako sa sny menia v čase?",
  "Prečo potrebujeme pravidlá hry?",
  "Kedy je mlčanie lepšie než slová?",
  "Čo je ideálny deň?",
  "Kde je hranica zodpovednosti?",
  "Ako chápeme krásu?",
  "Kedy riskovať má zmysel?"
];

const OBJEKTY = [
  "Stolička",
  "Rúra",
  "Dáždnik",
  "Hodiny",
  "Šálka",
  "Kniha",
  "Mobil",
  "Zrkadlo",
  "Kľúč",
  "Lampa",
  "Bicykel",
  "Vankúš",
  "Ruksak",
  "Ceruzka",
  "Kávovar",
  "Rastlina",
  "Kabát",
  "Fľaša",
  "Vysávač",
  "Toster"
];

const COLORS = [
  "#4ea1ff",
  "#ff6fb1",
  "#7dff8f",
  "#ffd166",
  "#b388ff",
  "#ff9f1c",
  "#00c2a8",
  "#f72585"
];

const $ = (id) => document.getElementById(id);

function choice(arr, exclude = []) {
  const pool = arr.filter(x => !exclude.includes(x));
  return pool[Math.floor(Math.random() * pool.length)];
}

const tema = $("tema");
const temaOut = $("temaOut");
const temaRnd = $("temaRnd");

const objInput = $("objInput");
const addParticipantBtn = $("addParticipant");
const participantsWrap = $("participants");
const participantsOut = $("participantsOut");

const whoNow = $("whoNow");
const line = $("line");
const addLine = $("addLine");
const switchBtn = $("switch");
const log = $("log");
const clearAll = $("clearAll");
const downloadBtn = $("download");

const roomInput = $("roomId");
const connectRoomBtn = $("connectRoom");
const onlineStatus = $("onlineStatus");

let participants = [];
let currentIndex = 0;
let entries = [];

let roomId = null;
let unsubscribe = null;
let online = false;

function syncAssignment() {
  temaOut.textContent = tema.value || "—";
  participantsOut.textContent = participants.map(p => p.name).join(", ") || "—";
}

function createParticipant(name) {
  return {
    id: crypto.randomUUID(),
    name,
    color: COLORS[participants.length % COLORS.length]
  };
}

function addParticipant(name = null) {
  const finalName =
    name ||
    objInput.value.trim() ||
    choice(OBJEKTY, participants.map(p => p.name));

  if (!finalName) return;

  participants.push(createParticipant(finalName));
  objInput.value = "";

  renderParticipants();
  syncAssignment();
  updateWho();
}

function renderParticipants() {
  participantsWrap.innerHTML = "";

  participants.forEach((p, index) => {
    const btn = document.createElement("button");

    btn.className = "chip" + (index === currentIndex ? " active" : "");
    btn.textContent = p.name;
    btn.style.background = p.color;

    btn.onclick = () => {
      currentIndex = index;
      renderParticipants();
      updateWho();
    };

    participantsWrap.appendChild(btn);
  });
}

function updateWho() {
  if (!participants.length) {
    whoNow.textContent = "—";
    return;
  }

  whoNow.textContent = participants[currentIndex].name;
}

function nextSpeaker() {
  if (!participants.length) return;

  currentIndex = (currentIndex + 1) % participants.length;

  renderParticipants();
  updateWho();
}

async function pushLine() {
  const txt = line.value.trim();

  if (!txt) return;

  if (!participants.length) {
    alert("Najprv pridaj účastníka.");
    return;
  }

  const speaker = participants[currentIndex];

  const message = {
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerColor: speaker.color,
    text: txt,
    localCreatedAt: Date.now()
  };

  line.value = "";

  if (online && roomId) {
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      ...message,
      createdAt: serverTimestamp()
    });
  } else {
    entries.push(message);
    renderLog();
  }

  nextSpeaker();
  line.focus();
}

function renderLog() {
  log.innerHTML = "";

  entries.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "line";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = e.speakerName;
    badge.style.background = e.speakerColor;

    const content = document.createElement("div");
    content.className = "content";
    content.textContent = e.text;

    row.appendChild(badge);
    row.appendChild(content);
    log.appendChild(row);

    if (i < entries.length - 1) {
      const hr = document.createElement("div");
      hr.className = "hr";
      log.appendChild(hr);
    }
  });

  log.scrollTop = log.scrollHeight;
}

function connectRoom() {
  const value = roomInput.value.trim();

  if (!value) {
    alert("Zadaj Room ID.");
    return;
  }

  roomId = value;
  online = true;

  if (unsubscribe) {
    unsubscribe();
  }

  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt")
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    entries = [];

    snapshot.forEach((doc) => {
      entries.push(doc.data());
    });

    renderLog();
  });

  onlineStatus.textContent = "Online miestnosť: " + roomId;
}

async function clearDialog() {
  if (!confirm("Vyčistiť celý dialóg?")) return;

  entries = [];
  renderLog();

  if (online && roomId) {
    const snap = await getDocs(collection(db, "rooms", roomId, "messages"));

    snap.forEach(async (docItem) => {
      await deleteDoc(docItem.ref);
    });
  }
}

function downloadTxt() {
  const temaText = tema.value || "bez_temy";

  const header =
    `Dialóg predmetov\n` +
    `Téma: ${tema.value || "—"}\n` +
    `Účastníci: ${participants.map(p => p.name).join(", ") || "—"}\n\n`;

  const body = entries
    .map(e => `${e.speakerName}: ${e.text}`)
    .join("\n");

  const blob = new Blob([header + body + "\n"], {
    type: "text/plain;charset=utf-8"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);

  const safe = temaText
    .toLowerCase()
    .replace(/[^a-z0-9áäčďéíĺľňóôŕšťúýž_-]+/gi, "-");

  a.download = `dialog-predmetov_${safe || "zaznam"}.txt`;

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

temaRnd.onclick = () => {
  tema.value = choice(TEMY);
  syncAssignment();
};

tema.addEventListener("input", syncAssignment);

addParticipantBtn.onclick = () => {
  addParticipant();
};

objInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addParticipant();
  }
});

addLine.onclick = pushLine;

line.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    pushLine();
  }
});

switchBtn.onclick = nextSpeaker;

clearAll.onclick = clearDialog;

downloadBtn.onclick = downloadTxt;

connectRoomBtn.onclick = connectRoom;

function init() {
  tema.value = choice(TEMY);

  addParticipant(choice(OBJEKTY));
  addParticipant(choice(OBJEKTY, participants.map(p => p.name)));

  syncAssignment();
  renderLog();
  line.focus();
}

init();

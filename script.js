import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDocs,
  updateDoc
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
  "#f72585",
  "#90be6d",
  "#f94144"
];

const $ = (id) => document.getElementById(id);

function choice(arr, exclude = []) {
  const pool = arr.filter(x => !exclude.includes(x));
  if (!pool.length) return arr[Math.floor(Math.random() * arr.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

const tema = $("tema");
const temaOut = $("temaOut");
const temaRnd = $("temaRnd");

const objInput = $("objInput");
const addParticipantBtn = $("addParticipant");
const participantRnd = $("participantRnd");
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
const offlineModeBtn = $("offlineMode");
const onlineStatus = $("onlineStatus");

let participants = [];
let currentSpeakerId = null;
let entries = [];

let roomId = "";
let online = false;
let previousTemaValue = "";

let unsubscribeMessages = null;
let unsubscribeParticipants = null;
let unsubscribeRoomMeta = null;

const clientId =
  localStorage.getItem("dialog-client-id") ||
  crypto.randomUUID();

localStorage.setItem("dialog-client-id", clientId);

function isMyParticipant(participant) {
  return !online || !participant.ownerId || participant.ownerId === clientId;
}

function getOwnParticipants() {
  return participants.filter(isMyParticipant);
}

function syncAssignment() {
  temaOut.textContent = tema.value || "—";
  participantsOut.textContent =
    participants.map(p => p.name).join(", ") || "—";
}

function updateWho() {
  const speaker = participants.find(p => p.id === currentSpeakerId);

  if (!speaker) {
    whoNow.textContent = "—";
    return;
  }

  whoNow.textContent = speaker.name;
}

function ensureValidCurrentSpeaker() {
  const selected = participants.find(p => p.id === currentSpeakerId);

  if (selected && isMyParticipant(selected)) return;

  const ownParticipant = getOwnParticipants()[0];

  currentSpeakerId = ownParticipant ? ownParticipant.id : null;
}

function renderParticipants() {
  participantsWrap.innerHTML = "";

  participants.forEach((p) => {
    const btn = document.createElement("button");

    btn.className = "chip" + (p.id === currentSpeakerId ? " active" : "");
    btn.textContent = p.name;
    btn.style.background = p.color;

    if (!isMyParticipant(p)) {
      btn.style.opacity = ".45";
      btn.title = "Cudzí účastník";
    }

    btn.onclick = () => {
      if (!isMyParticipant(p)) {
        alert("Nemôžeš písať za cudzieho účastníka.");
        return;
      }

      currentSpeakerId = p.id;
      renderParticipants();
      updateWho();
    };

    participantsWrap.appendChild(btn);
  });

  syncAssignment();
  updateWho();
}

function renderLog() {
  log.innerHTML = "";

  entries.forEach((e, i) => {
    const row = document.createElement("div");
    row.className = "line";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = e.speakerName || "?";
    badge.style.background = e.speakerColor || "#4ea1ff";

    const content = document.createElement("div");
    content.className = "content";
    content.textContent = e.text || "";

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

function createParticipant(name) {
  return {
    id: crypto.randomUUID(),
    ownerId: clientId,
    name,
    color: COLORS[participants.length % COLORS.length],
    localCreatedAt: Date.now()
  };
}

async function addParticipant(name = null) {
  const finalName =
    name ||
    objInput.value.trim() ||
    choice(OBJEKTY, participants.map(p => p.name));

  if (!finalName) return;

  const participant = createParticipant(finalName);

  objInput.value = "";
  currentSpeakerId = participant.id;

  if (online && roomId) {
    await setDoc(
      doc(db, "rooms", roomId, "participants", participant.id),
      {
        ...participant,
        createdAt: serverTimestamp()
      }
    );
  } else {
    participants.push(participant);
    renderParticipants();
  }
}

function nextSpeaker() {
  const ownParticipants = getOwnParticipants();

  if (!ownParticipants.length) {
    alert("Nemáš vlastného účastníka.");
    currentSpeakerId = null;
    renderParticipants();
    updateWho();
    return;
  }

  const currentOwnIndex = ownParticipants.findIndex(
    p => p.id === currentSpeakerId
  );

  const nextIndex =
    currentOwnIndex === -1
      ? 0
      : (currentOwnIndex + 1) % ownParticipants.length;

  currentSpeakerId = ownParticipants[nextIndex].id;

  renderParticipants();
  updateWho();
}

async function addSystemMessage(text) {
  const message = {
    speakerId: "system",
    speakerOwnerId: "system",
    speakerName: "SYSTEM",
    speakerColor: "#ffffff",
    text,
    localCreatedAt: Date.now()
  };

  if (online && roomId) {
    await addDoc(
      collection(db, "rooms", roomId, "messages"),
      {
        ...message,
        createdAt: serverTimestamp()
      }
    );
  } else {
    entries.push(message);
    renderLog();
  }
}

async function pushLine() {
  const txt = line.value.trim();

  if (!txt) return;

  if (!participants.length) {
    alert("Najprv pridaj účastníka.");
    return;
  }

  ensureValidCurrentSpeaker();

  const speaker = participants.find(p => p.id === currentSpeakerId);

  if (!speaker) {
    alert("Vyber účastníka.");
    return;
  }

  if (!isMyParticipant(speaker)) {
    alert("Nemôžeš písať za cudzieho účastníka.");
    return;
  }

  const message = {
    speakerId: speaker.id,
    speakerOwnerId: speaker.ownerId || clientId,
    speakerName: speaker.name,
    speakerColor: speaker.color,
    text: txt,
    localCreatedAt: Date.now()
  };

  line.value = "";

  if (online && roomId) {
    try {
      await addDoc(
        collection(db, "rooms", roomId, "messages"),
        {
          ...message,
          createdAt: serverTimestamp()
        }
      );
    } catch (error) {
      console.error("Firebase write error:", error);
      alert("Chyba Firebase.");
      entries.push(message);
      renderLog();
    }
  } else {
    entries.push(message);
    renderLog();
  }

  nextSpeaker();
  line.focus();
}

function connectRoom() {
  const value = roomInput.value.trim();

  if (!value) {
    alert("Zadaj Room ID.");
    return;
  }

  roomId = value;
  online = true;

  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeParticipants) unsubscribeParticipants();
  if (unsubscribeRoomMeta) unsubscribeRoomMeta();

  entries = [];
  participants = [];
  currentSpeakerId = null;

  renderLog();
  renderParticipants();

  onlineStatus.textContent = "Pripájam sa do miestnosti: " + roomId;

  const messagesQuery = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt")
  );

  unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
    entries = [];

    snapshot.forEach((docItem) => {
      const data = docItem.data();

      entries.push({
        speakerId: data.speakerId,
        speakerOwnerId: data.speakerOwnerId,
        speakerName: data.speakerName,
        speakerColor: data.speakerColor,
        text: data.text,
        localCreatedAt: data.localCreatedAt,
        createdAt: data.createdAt
      });
    });

    renderLog();
    onlineStatus.textContent = "Online miestnosť: " + roomId;
  });

  const participantsQuery = query(
    collection(db, "rooms", roomId, "participants"),
    orderBy("createdAt")
  );

  unsubscribeParticipants = onSnapshot(participantsQuery, (snapshot) => {
    participants = [];

    snapshot.forEach((docItem) => {
      const data = docItem.data();

      participants.push({
        id: data.id || docItem.id,
        ownerId: data.ownerId || "",
        name: data.name,
        color: data.color,
        localCreatedAt: data.localCreatedAt,
        createdAt: data.createdAt
      });
    });

    ensureValidCurrentSpeaker();
    renderParticipants();
  });

  const roomRef = doc(db, "rooms", roomId);

  unsubscribeRoomMeta = onSnapshot(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      tema.value = "";
      previousTemaValue = "";
      syncAssignment();
      return;
    }

    const data = snapshot.data();

    if (typeof data.tema === "string" && tema.value !== data.tema) {
      tema.value = data.tema;
      previousTemaValue = data.tema;
      syncAssignment();
    }
  });
}

function goOffline() {
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeParticipants) unsubscribeParticipants();
  if (unsubscribeRoomMeta) unsubscribeRoomMeta();

  unsubscribeMessages = null;
  unsubscribeParticipants = null;
  unsubscribeRoomMeta = null;

  online = false;
  roomId = "";

  roomInput.value = "";
  onlineStatus.textContent = "Offline režim";

  entries = [];
  participants = [];
  currentSpeakerId = null;

  tema.value = choice(TEMY);
  previousTemaValue = tema.value;

  addParticipant(choice(OBJEKTY));
  addParticipant(choice(OBJEKTY, participants.map(p => p.name)));

  renderLog();
  renderParticipants();
  syncAssignment();

  line.focus();
}

async function saveTemaOnline() {
  if (!online || !roomId) return;

  await setDoc(
    doc(db, "rooms", roomId),
    {
      tema: tema.value || "",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function clearCollection(pathParts) {
  const snap = await getDocs(collection(db, ...pathParts));
  const deletes = [];

  snap.forEach((docItem) => {
    deletes.push(deleteDoc(docItem.ref));
  });

  await Promise.all(deletes);
}

async function clearDialog() {
  if (!confirm("Vyčistiť celú miestnosť?")) return;

  entries = [];
  participants = [];
  currentSpeakerId = null;
  tema.value = "";
  previousTemaValue = "";
  objInput.value = "";
  line.value = "";

  renderLog();
  renderParticipants();
  syncAssignment();

  if (online && roomId) {
    try {
      await clearCollection(["rooms", roomId, "messages"]);
      await clearCollection(["rooms", roomId, "participants"]);

      await setDoc(
        doc(db, "rooms", roomId),
        {
          tema: "",
          clearedAt: serverTimestamp()
        },
        { merge: true }
      );

      onlineStatus.textContent =
        "Miestnosť vyčistená: " + roomId;
    } catch (error) {
      console.error("Firebase clear room error:", error);
      alert("Nepodarilo sa vyčistiť celú miestnosť.");
    }
  }
}

function downloadTxt() {
  const temaText = tema.value || "bez_temy";

  const header =
    `Dialóg predmetov\n` +
    `Téma: ${tema.value || "—"}\n` +
    `Účastníci: ${
      participants.map(p => p.name).join(", ") || "—"
    }\n\n`;

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

temaRnd.onclick = async () => {
  const oldTema = tema.value || "—";
  const newTema = choice(TEMY, [oldTema]);

  tema.value = newTema;

  if (oldTema !== newTema) {
    await addSystemMessage(
      `Téma bola zmenená: "${oldTema}" → "${newTema}"`
    );
  }

  previousTemaValue = newTema;
  syncAssignment();
  await saveTemaOnline();
};

tema.addEventListener("change", async () => {
  const oldTema = previousTemaValue || "—";
  const newTema = tema.value.trim();

  if (newTema !== previousTemaValue) {
    await addSystemMessage(
      `Téma bola zmenená: "${oldTema}" → "${newTema || "—"}"`
    );
  }

  previousTemaValue = newTema;
  syncAssignment();
  await saveTemaOnline();
});

participantRnd.onclick = () => {
  objInput.value = choice(
    OBJEKTY,
    participants.map(p => p.name)
  );
};

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
offlineModeBtn.onclick = goOffline;

function init() {
  tema.value = choice(TEMY);
  previousTemaValue = tema.value;

  addParticipant(choice(OBJEKTY));
  addParticipant(choice(OBJEKTY, participants.map(p => p.name)));

  syncAssignment();
  renderLog();
  line.focus();
}

init();

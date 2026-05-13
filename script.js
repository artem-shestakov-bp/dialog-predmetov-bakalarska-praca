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
  "#f72585",
  "#90be6d",
  "#f94144"
];

const $ = (id) => document.getElementById(id);

function choice(arr, exclude = []) {
  const pool = arr.filter(x => !exclude.includes(x));

  if (!pool.length) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

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

let roomId = "";
let online = false;

let unsubscribeMessages = null;
let unsubscribeParticipants = null;
let unsubscribeRoomMeta = null;

function syncAssignment() {
  temaOut.textContent = tema.value || "—";

  participantsOut.textContent =
    participants.map(p => p.name).join(", ") || "—";
}

function updateWho() {
  if (!participants.length) {
    whoNow.textContent = "—";
    return;
  }

  if (currentIndex >= participants.length) {
    currentIndex = 0;
  }

  whoNow.textContent = participants[currentIndex].name;
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
      alert("Chyba Firebase. Správa bola uložená iba lokálne.");

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
  currentIndex = 0;

  renderLog();
  renderParticipants();

  onlineStatus.textContent = "Pripájam sa do miestnosti: " + roomId;

  const messagesQuery = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt")
  );

  unsubscribeMessages = onSnapshot(
    messagesQuery,
    (snapshot) => {
      entries = [];

      snapshot.forEach((docItem) => {
        const data = docItem.data();

        entries.push({
          speakerId: data.speakerId,
          speakerName: data.speakerName,
          speakerColor: data.speakerColor,
          text: data.text,
          localCreatedAt: data.localCreatedAt,
          createdAt: data.createdAt
        });
      });

      renderLog();
      onlineStatus.textContent = "Online miestnosť: " + roomId;
    },
    (error) => {
      console.error("Firebase messages listen error:", error);
      onlineStatus.textContent = "Chyba Firebase messages";
      alert("Firebase messages realtime zlyhalo. Skontroluj Rules.");
    }
  );

  const participantsQuery = query(
    collection(db, "rooms", roomId, "participants"),
    orderBy("createdAt")
  );

  unsubscribeParticipants = onSnapshot(
    participantsQuery,
    (snapshot) => {
      participants = [];

      snapshot.forEach((docItem) => {
        const data = docItem.data();

        participants.push({
          id: data.id || docItem.id,
          name: data.name,
          color: data.color,
          localCreatedAt: data.localCreatedAt,
          createdAt: data.createdAt
        });
      });

      if (currentIndex >= participants.length) {
        currentIndex = 0;
      }

      renderParticipants();
    },
    (error) => {
      console.error("Firebase participants listen error:", error);
      onlineStatus.textContent = "Chyba Firebase participants";
      alert("Firebase participants realtime zlyhalo. Skontroluj Rules.");
    }
  );

  const roomRef = doc(db, "rooms", roomId);

  unsubscribeRoomMeta = onSnapshot(roomRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();

    if (data.tema && tema.value !== data.tema) {
      tema.value = data.tema;
      syncAssignment();
    }
  });
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

async function clearDialog() {
  if (!confirm("Vyčistiť celý dialóg?")) return;

  entries = [];
  renderLog();

  if (online && roomId) {
    try {
      const snap = await getDocs(
        collection(db, "rooms", roomId, "messages")
      );

      const deletes = [];

      snap.forEach((docItem) => {
        deletes.push(deleteDoc(docItem.ref));
      });

      await Promise.all(deletes);
    } catch (error) {
      console.error("Firebase delete error:", error);
      alert("Nepodarilo sa vyčistiť online miestnosť.");
    }
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

temaRnd.onclick = async () => {
  tema.value = choice(TEMY);
  syncAssignment();
  await saveTemaOnline();
};

tema.addEventListener("input", async () => {
  syncAssignment();
  await saveTemaOnline();
});

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

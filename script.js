import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAIOjW8KaG_9WDcsF0BnwYqr_zp47zN8j4",
  authDomain: "bakalarska-praca-b0f89.firebaseapp.com",
  projectId: "bakalarska-praca-b0f89",
  storageBucket: "bakalarska-praca-b0f89.firebasestorage.app",
  messagingSenderId: "69722305708",
  appId: "1:69722305708:web:cd042b93293b5357705b09"
};

// INIT FIREBASE
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

// HELPERS
const $ = (id) => document.getElementById(id);

const colors = [
  "#4ea1ff",
  "#ff6fb1",
  "#7dff8f",
  "#ffd166",
  "#b388ff",
  "#ff9f1c"
];

// STATE
let participants = [];
let currentSpeaker = null;
let entries = [];
let roomId = "default-room";

// ELEMENTS
const participantsWrap = $("participants");

const addParticipantBtn = $("addParticipant");

const lineInput = $("line");

const addLineBtn = $("addLine");

const log = $("log");

const roomInput = $("roomId");

const connectBtn = $("connectRoom");

// PARTICIPANTS
function createParticipant(name) {
  return {
    id: crypto.randomUUID(),
    name,
    color: colors[participants.length % colors.length]
  };
}

function addParticipant(name = null) {

  const pname = name || prompt("Meno účastníka:");

  if (!pname) return;

  const participant = createParticipant(pname);

  participants.push(participant);

  if (!currentSpeaker) {
    currentSpeaker = participant.id;
  }

  renderParticipants();
}

function renderParticipants() {

  participantsWrap.innerHTML = "";

  participants.forEach((p) => {

    const btn = document.createElement("button");

    btn.className = "chip";

    btn.textContent = p.name;

    btn.style.background = p.color;

    if (currentSpeaker === p.id) {
      btn.style.outline = "3px solid white";
    }

    btn.onclick = () => {
      currentSpeaker = p.id;
      renderParticipants();
    };

    participantsWrap.appendChild(btn);
  });
}

// MESSAGES
async function pushLine() {

  const txt = lineInput.value.trim();

  if (!txt) return;

  if (!currentSpeaker) {
    alert("Pridaj účastníka");
    return;
  }

  const speaker = participants.find(
    p => p.id === currentSpeaker
  );

  const message = {
    speakerId: speaker.id,
    speakerName: speaker.name,
    speakerColor: speaker.color,
    text: txt,
    createdAt: Date.now()
  };

  lineInput.value = "";

  await addDoc(
    collection(db, "rooms", roomId, "messages"),
    {
      ...message,
      createdAt: serverTimestamp()
    }
  );
}

function renderLog() {

  log.innerHTML = "";

  entries.forEach((e) => {

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
  });

  log.scrollTop = log.scrollHeight;
}

// FIREBASE ROOM
function connectRoom() {

  roomId = roomInput.value.trim();

  if (!roomId) {

    alert("Enter room ID");

    return;
  }

  const q = query(
    collection(db, "rooms", roomId, "messages"),
    orderBy("createdAt")
  );

  onSnapshot(q, (snapshot) => {

    entries = [];

    snapshot.forEach((doc) => {
      entries.push(doc.data());
    });

    renderLog();
  });

  alert("Connected to room: " + roomId);
}

// EVENTS
addParticipantBtn.onclick = () => {
  addParticipant();
};

addLineBtn.onclick = () => {
  pushLine();
};

lineInput.addEventListener("keydown", (e) => {

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    pushLine();
  }
});

connectBtn.onclick = () => {
  connectRoom();
};

// INIT
addParticipant("A");

addParticipant("B");

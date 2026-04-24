let mediaRecorder;
let audioChunks = [];
let currentAudioUrl = null;

const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");
const languageSelect = document.getElementById("languageSelect");
const voiceSelect = document.getElementById("voiceSelect");
const assistantModeInput = document.getElementById("assistantMode");
const textInput = document.getElementById("textInput");
const sendTextBtn = document.getElementById("sendTextBtn");
const transcriptOutput = document.getElementById("transcriptOutput");
const responseOutput = document.getElementById("responseOutput");
const audioPlayer = document.getElementById("audioPlayer");
const assistantFace = document.getElementById("assistantFace");
const assistantAura = document.getElementById("assistantAura");
const assistantMood = document.getElementById("assistantMood");

// ================= STATUS =================
const setStatus = (message) => {
  statusText.textContent = message;
};

// ================= AVATAR =================
const setAvatarState = (state) => {
  assistantFace.dataset.state = state;

  const states = {
    idle: { emoji: "🙂", aura: "✨", mood: "Ready to help" },
    listening: { emoji: "👂", aura: "🎧", mood: "Listening carefully" },
    thinking: { emoji: "🤔", aura: "💭", mood: "Thinking and translating" },
    speaking: { emoji: "😄", aura: "🗣️", mood: "Speaking the reply" },
    error: { emoji: "🥺", aura: "⚠️", mood: "Something needs another try" },
  };

  const nextState = states[state] || states.idle;
  assistantFace.textContent = nextState.emoji;
  assistantAura.textContent = nextState.aura;
  assistantMood.textContent = nextState.mood;
};

// ================= BUTTON CONTROL =================
const setRecordButton = ({ active, disabled, label }) => {
  startBtn.classList.toggle("active", active);
  startBtn.disabled = disabled;
  startBtn.textContent = label;
};

const setIdleState = () => {
  setRecordButton({
    active: false,
    disabled: false,
    label: "Start speaking",
  });

  sendTextBtn.disabled = false;

  if (audioPlayer.paused || audioPlayer.ended) {
    setAvatarState("idle");
  }
};

// ================= UTILS =================
const stopTracks = () => {
  mediaRecorder?.stream?.getTracks().forEach((track) => track.stop());
};

// ================= START RECORDING =================
async function startRecording() {
  // 🔁 Toggle behavior
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", sendAudioToAssistant, { once: true });

    mediaRecorder.start();

    setRecordButton({
      active: true,
      disabled: false,
      label: "Stop listening",
    });

    setAvatarState("listening");
    setStatus("Listening...");
  } catch (error) {
    console.error(error);
    setAvatarState("error");
    setStatus("Microphone permission denied.");
    setIdleState();
  }
}

// ================= STOP RECORDING =================
async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;

  setRecordButton({
    active: false,
    disabled: true,
    label: "Stopping...",
  });

  setStatus("Processing...");
  mediaRecorder.stop();
}

// ================= SEND AUDIO =================
async function sendAudioToAssistant() {
  try {
    const audioBlob = new Blob(audioChunks, {
      type: mediaRecorder.mimeType || "audio/webm",
    });

    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("targetLanguage", languageSelect.value);
    formData.append("voice", voiceSelect.value);
    formData.append("assistantMode", assistantModeInput.value.trim() || "helpful");

    setAvatarState("thinking");

    const response = await fetch("/voice", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) throw new Error(payload.error);

    transcriptOutput.textContent = payload.transcript;
    responseOutput.textContent = payload.responseText;

    // 🎧 AUDIO PLAY
    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);

    const audioBytes = Uint8Array.from(atob(payload.audioBase64), (c) =>
      c.charCodeAt(0)
    );

    const blob = new Blob([audioBytes], { type: payload.audioMimeType });
    currentAudioUrl = URL.createObjectURL(blob);

    audioPlayer.src = currentAudioUrl;

    setAvatarState("speaking");
    await audioPlayer.play().catch(() => {});

  } catch (error) {
    console.error(error);
    setAvatarState("error");
    setStatus("Voice processing failed.");
  } finally {
    stopTracks();
    setIdleState();
  }
}

// ================= TEXT SEND =================
async function sendTextToAssistant() {
  const text = textInput.value.trim();
  if (!text) return;

  sendTextBtn.disabled = true;
  startBtn.disabled = true;

  try {
    setAvatarState("thinking");

    const response = await fetch("/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        targetLanguage: languageSelect.value,
        voice: voiceSelect.value,
        assistantMode: assistantModeInput.value.trim() || "helpful",
      }),
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);

    transcriptOutput.textContent = payload.transcript;
    responseOutput.textContent = payload.responseText;

    if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);

    const audioBytes = Uint8Array.from(atob(payload.audioBase64), (c) =>
      c.charCodeAt(0)
    );

    const blob = new Blob([audioBytes], { type: payload.audioMimeType });
    currentAudioUrl = URL.createObjectURL(blob);

    audioPlayer.src = currentAudioUrl;

    setAvatarState("speaking");
    await audioPlayer.play().catch(() => {});
  } catch (error) {
    console.error(error);
    setAvatarState("error");
  } finally {
    setIdleState();
  }
}

// ================= EVENTS =================
startBtn.addEventListener("click", startRecording);
sendTextBtn.addEventListener("click", sendTextToAssistant);

audioPlayer.addEventListener("play", () => setAvatarState("speaking"));
audioPlayer.addEventListener("ended", () => setAvatarState("idle"));

textInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    sendTextToAssistant();
  }
});

// ================= INIT =================
setIdleState();
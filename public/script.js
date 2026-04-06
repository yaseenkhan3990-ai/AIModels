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

const setStatus = (message) => {
    statusText.textContent = message;
};

const setAvatarState = (state) => {
    assistantFace.dataset.state = state;

    const states = {
        idle: {
            emoji: "🙂",
            aura: "✨",
            mood: "Ready to help",
        },
        listening: {
            emoji: "👂",
            aura: "🎧",
            mood: "Listening carefully",
        },
        thinking: {
            emoji: "🤔",
            aura: "💭",
            mood: "Thinking and translating",
        },
        speaking: {
            emoji: "😄",
            aura: "🗣️",
            mood: "Speaking the reply",
        },
        error: {
            emoji: "🥺",
            aura: "⚠️",
            mood: "Something needs another try",
        },
    };

    const nextState = states[state] || states.idle;
    assistantFace.textContent = nextState.emoji;
    assistantAura.textContent = nextState.aura;
    assistantMood.textContent = nextState.mood;
};

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

const stopTracks = () => {
    mediaRecorder?.stream?.getTracks().forEach((track) => track.stop());
};

async function startRecording() {
    if (startBtn.classList.contains('active')) {
        startBtn.classList.remove('active');
        startBtn.textContent = 'start '
    }
    else {
        startBtn.classList.add('active');
        startBtn.textContent = 'stop Listening'
    }
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
        setStatus("Listening... speak now.");
    } catch (error) {
        console.error(error);
        setAvatarState("error");
        setStatus("Microphone access was blocked. Please allow it and try again.");
        setIdleState();
    }
}

async function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state !== "recording") {
        return;
    }

    setRecordButton({
        active: false,
        disabled: true,
        label: "Stopping...",
    });
    setStatus("Uploading your voice...");
    mediaRecorder.stop();
}

async function sendAudioToAssistant() {
    try {
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
        const formData = new FormData();

        formData.append("audio", audioBlob, "voice-message.webm");
        formData.append("targetLanguage", languageSelect.value);
        formData.append("voice", voiceSelect.value);
        formData.append("assistantMode", assistantModeInput.value.trim() || "helpful");

        setAvatarState("thinking");
        setStatus("Transcribing, translating, and creating the voice reply...");

        const response = await fetch("/voice", {
            method: "POST",
            body: formData,
        });

        const payload = await response.json();

        if (!response.ok) {
            throw new Error(payload.error || "The assistant could not process the request.");
        }

        transcriptOutput.textContent = payload.transcript;
        responseOutput.textContent = payload.responseText;

        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
        }

        const audioBytes = Uint8Array.from(atob(payload.audioBase64), (char) => char.charCodeAt(0));
        const responseBlob = new Blob([audioBytes], { type: payload.audioMimeType });
        currentAudioUrl = URL.createObjectURL(responseBlob);

        audioPlayer.src = currentAudioUrl;
        setAvatarState("speaking");
        await audioPlayer.play().catch(() => { });

        setStatus(`Ready in ${payload.targetLanguage}.`);
    } catch (error) {
        console.error(error);
        setAvatarState("error");
        setStatus(error.message || "Something went wrong while creating the reply.");
    } finally {
        stopTracks();
        setIdleState();
    }
}

async function sendTextToAssistant() {
    const text = textInput.value.trim();

    if (!text) {
        setStatus("Type a message first, then send it.");
        textInput.focus();
        return;
    }

    sendTextBtn.disabled = true;
    startBtn.disabled = true;

    try {
        setAvatarState("thinking");
        setStatus("Writing the reply and creating its voice...");

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

        if (!response.ok) {
            throw new Error(payload.error || "The assistant could not process the text.");
        }

        transcriptOutput.textContent = payload.transcript;
        responseOutput.textContent = payload.responseText;

        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
        }

        const audioBytes = Uint8Array.from(atob(payload.audioBase64), (char) => char.charCodeAt(0));
        const responseBlob = new Blob([audioBytes], { type: payload.audioMimeType });
        currentAudioUrl = URL.createObjectURL(responseBlob);

        audioPlayer.src = currentAudioUrl;
        setAvatarState("speaking");
        await audioPlayer.play().catch(() => { });

        setStatus(`Text reply ready in ${payload.targetLanguage}.`);
    } catch (error) {
        console.error(error);
        setAvatarState("error");
        setStatus(error.message || "Something went wrong while handling the text.");
    } finally {
        setIdleState();
    }
}

startBtn.addEventListener("click", startRecording);
sendTextBtn.addEventListener("click", sendTextToAssistant);
audioPlayer.addEventListener("play", () => setAvatarState("speaking"));
audioPlayer.addEventListener("ended", () => setAvatarState("idle"));
audioPlayer.addEventListener("pause", () => {
    if (!audioPlayer.ended) {
        setAvatarState("idle");
    }
});
textInput.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        sendTextToAssistant();
    }
});

setIdleState();
setStatus("Choose a language, then speak or type to your assistant.");

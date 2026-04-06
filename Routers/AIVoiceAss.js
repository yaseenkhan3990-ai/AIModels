import multer from "multer";
import fs from "fs";
import { promises as fsPromises } from "fs";
import OpenAI from "openai";
import express from "express";
 
const upload = multer({ dest: "uploads/" });

const aiVoiceAss = express.Router();
const supportedLanguages = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Japanese",
  "Korean",
  "Tamil",
  "Telugu",
];

const supportedVoices = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
];


aiVoiceAss.get("/", (req, res) => {
  res.redirect("/home");
});

aiVoiceAss.get("/home", (req, res) => {
  res.render("home", {
    languages: supportedLanguages,
    voices: supportedVoices,
    defaultLanguage: "English",
    defaultVoice: "alloy",
  });
});

function normalizeAssistantOptions(body = {}) {
  const targetLanguage = supportedLanguages.includes(body.targetLanguage)
    ? body.targetLanguage
    : "English";
  const selectedVoice = supportedVoices.includes(body.voice)
    ? body.voice
    : "alloy";
  const assistantMode = (body.assistantMode || "helpful").trim();

  return {
    targetLanguage,
    selectedVoice,
    assistantMode,
  };
}

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function buildAssistantResponse({
  client,
  userText,
  targetLanguage,
  selectedVoice,
  assistantMode,
}) {
  const chat = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          `You are a friendly voice assistant. ` +
          `Reply only in ${targetLanguage}. ` +
          `Keep the answer natural, concise, and easy to understand when spoken aloud. ` +
          `Assistant style: ${assistantMode}.`,
      },
      {
        role: "user",
        content:
          `The user said: "${userText}". ` +
          `If helpful, answer the request. If they appear to want translation, translate their words into ${targetLanguage}.`,
      },
    ],
  });

  const replyText = chat.choices[0]?.message?.content?.trim();

  if (!replyText) {
    throw new Error("The assistant did not return a spoken reply.");
  }

  const speech = await client.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: selectedVoice,
    input: replyText,
    format: "mp3",
  });

  const audioBuffer = Buffer.from(await speech.arrayBuffer());

  return {
    transcript: userText,
    responseText: replyText,
    targetLanguage,
    voice: selectedVoice,
    audioBase64: audioBuffer.toString("base64"),
    audioMimeType: "audio/mpeg",
  };
}

aiVoiceAss.post("/voice", upload.single("audio"), async (req, res) => {
  const uploadedFilePath = req.file?.path;
  const client = getClient();

  if (!client) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY on the server.",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      error: "Please record audio before sending the request.",
    });
  }

  const { targetLanguage, selectedVoice, assistantMode } = normalizeAssistantOptions(req.body);

  try {
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(uploadedFilePath),
      model: "gpt-4o-mini-transcribe",
    });

    const userText = transcription.text?.trim();

    if (!userText) {
      return res.status(400).json({
        error: "I could not hear any clear speech. Please try again.",
      });
    }

    const payload = await buildAssistantResponse({
      client,
      userText,
      targetLanguage,
      selectedVoice,
      assistantMode,
    });

    res.json(payload);
  } catch (error) {
    console.error("Voice assistant request failed:");
    res.status(500).json({
      error: "There was a problem processing the voice request.",
    });
  } finally {
    if (uploadedFilePath) {
      await fsPromises.unlink(uploadedFilePath).catch(() => {});
    }
  }
});

aiVoiceAss.post("/text", async (req, res) => {
  const client = getClient();

  if (!client) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY on the server.",
    });
  }

  const userText = req.body.text?.trim();

  if (!userText) {
    return res.status(400).json({
      error: "Please type a message before sending it.",
    });
  }

  const { targetLanguage, selectedVoice, assistantMode } = normalizeAssistantOptions(req.body);

  try {
    const payload = await buildAssistantResponse({
      client,
      userText,
      targetLanguage,
      selectedVoice,
      assistantMode,
    });

    res.json(payload);
  } catch (error) {
    console.error("Text assistant request failed:");
    res.status(500).json({
      error: "There was a problem processing the text request.",
    });
  }
});

export default aiVoiceAss;

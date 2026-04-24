import express from "express";
import multer from "multer";
import fs from "fs";
import { promises as fsPromises } from "fs";
import OpenAI from "openai";

const cc = express.Router();
const upload = multer({ dest: "uploads/" });

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}
cc.get('/home',(req,res)=>{
  res.render('contentCreation.ejs')
})

cc.post("/analyze", upload.single("video"), async (req, res) => {
  const client = getClient();
  const filePath = req.file?.path;

  if (!filePath) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // 🔹 Step 1: Transcription
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "gpt-4o-mini-transcribe",
    });

    const transcript = transcription.text || "";

    // 🔹 Step 2: AI Analysis
    const chat = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are a content strategist.

Analyze transcript and generate:
- summary
- hook
- spoken highlights
- visual highlights (guess if needed)
- performance reason
- youtube title
- instagram caption

Return JSON only.
`,
        },
        {
          role: "user",
          content: `Transcript:\n${transcript}`,
        },
      ],
    });

    const aiText = chat.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      parsed = { raw: aiText };
    }

    res.json({
      transcript,
      ...parsed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  } finally {
    await fsPromises.unlink(filePath).catch(() => {});
  }
});

export default cc;
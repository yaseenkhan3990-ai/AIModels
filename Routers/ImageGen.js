import express from "express";
import multer from "multer";
import fs from "fs";
import os from "os";
import { GoogleGenerativeAI } from "@google/generative-ai";


const imageG = express.Router();
const upload = multer({ dest: process.env.VERCEL ? os.tmpdir() : "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

imageG.get("/home", (req, res) => {
  res.render("imageGen", { image: null, prompt: "" });
});

imageG.post("/generate", upload.single("image"), async (req, res) => {
  const filePath = req.file?.path;
  const prompt = req.body.prompt || "";

  if (!filePath) {
    return res.send("No image uploaded");
  }

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const fullPrompt = `
Convert this image into a cartoon-style illustration.

Style:
- cartoon
- vibrant
- smooth shading
- modern digital art
- high quality

Extra instruction:
${prompt}
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: fullPrompt },
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();
    const finalImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(responseText)}`;

    res.json("imageGen", {
      image: finalImage,
      prompt,
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
    res.json("Error processing image");
  }
});

export default imageG;

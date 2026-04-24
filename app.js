import express from "express";
import dotenv from "dotenv";
import aiVoiceAss from "./Routers/AIVoiceAss.js";
import contentCreation from "./Routers/ContentCreation.js";
import tfml from "./Routers/ProductSearch.js";
import rnml from "./Routers/RainPrediction.js";
import imageG from "./Routers/ImageGen.js";
dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index", {
    services: [
      {
        name: "AI Voice Assistant",
        path: "/ai/home",
        tag: "OpenAI",
        description:
          "Speak or type, translate across languages, and hear the answer back as audio.",
        bullets: [
          "Voice input and text input",
          "Multi-language replies",
          "Audio response playback",
        ],
      },
      {
        name: "Content Creation Studio",
        path: "/contentCreation/home",
        tag: "OpenAI",
        description:
          "Upload a video and generate platform-ready titles, captions, descriptions, and hashtags in one structured workflow.",
        bullets: [
          "Video upload and transcript extraction",
          "YouTube, Instagram, and Facebook packages",
          "Clean structured output for posting",
        ],
      },
      {
        name: "Product Deal Search",
        path: "/ml/predict",
        tag: "Deal Score",
        description:
          "Find out whether a product looks like the best deal using price, sale count, rating, and discount.",
        bullets: [
          "Price-aware scoring",
          "Sales, rating, and discount checks",
          "Instant deal result",
        ],
      },
      {
        name: "Rain Prediction",
        path: "/rnml/predict",
        tag: "Weather ML",
        description:
          "Estimate the chance of rain from weather conditions like temperature and cloud cover.",
        bullets: [
          "Rain chance score",
          "Readable forecast summary",
          "Manual weather inputs",
        ],
      },
       {
        name: "Image Generator",
        path: "/imgG/home",
        tag: "Image Gen",
        description:
          "image Generator",
        bullets: [
          "Generate Image",
          "Manual image  inputs",
        ],
      },
    ],
  });
});

app.get("/home", (req, res) => {
  res.redirect("/");
});

app.use("/ai", aiVoiceAss);
app.use("/contentCreation", contentCreation);
app.use("/ml", tfml);
app.use('/rnml',rnml);
app.use('/imgG',imageG)
app.listen(port, () => {
  console.log(`Application running at http://localhost:${port}`);
});

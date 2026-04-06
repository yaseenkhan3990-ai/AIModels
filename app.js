import express from "express";
import dotenv from "dotenv";
import aiVoiceAss from "./Routers/AIVoiceAss.js";
import tfml from "./Routers/ProductSearch.js";
import rnml from "./Routers/RainPrediction.js";
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
        name: "Product Deal Predictor",
        path: "/ml/predict",
        tag: "TensorFlow",
        description:
          "Check if a product looks like a good deal using price, discount, rating, and stock.",
        bullets: [
          "Quick scoring",
          "Simple product inputs",
          "Useful for comparing offers",
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
    ],
  });
});

app.get("/home", (req, res) => {
  res.redirect("/");
});

app.use("/ai", aiVoiceAss);
app.use("/ml", tfml);
app.use('/rnml',rnml);

app.listen(port, () => {
  console.log(`Voice assistant running at http://localhost:${port}`);
});

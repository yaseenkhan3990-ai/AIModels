import express from "express";
import * as tf from "@tensorflow/tfjs";

const rnml = express.Router();
let model;
let featureStats;

function normalizeInput(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function buildFeatureStats(rows) {
    const featureCount = rows[0].length;

    return Array.from({ length: featureCount }, (_, index) => {
        const values = rows.map((row) => row[index]);

        return {
            min: Math.min(...values),
            max: Math.max(...values)
        };
    });
}

function normalizeFeatures(rows, stats) {
    return rows.map((row) =>
        row.map((value, index) => {
            const { min, max } = stats[index];
            const range = max - min;

            return range === 0 ? 0 : (value - min) / range;
        })
    );
}

function loadData() {
    const raw = [
        { temperature: 32, humidity: 88, windSpeed: 18, cloudCover: 92, label: 1 },
        { temperature: 30, humidity: 84, windSpeed: 14, cloudCover: 86, label: 1 },
        { temperature: 28, humidity: 91, windSpeed: 12, cloudCover: 95, label: 1 },
        { temperature: 35, humidity: 42, windSpeed: 8, cloudCover: 22, label: 0 },
        { temperature: 37, humidity: 36, windSpeed: 10, cloudCover: 18, label: 0 },
        { temperature: 29, humidity: 79, windSpeed: 20, cloudCover: 88, label: 1 },
        { temperature: 33, humidity: 67, windSpeed: 11, cloudCover: 54, label: 0 },
        { temperature: 27, humidity: 93, windSpeed: 16, cloudCover: 97, label: 1 },
        { temperature: 31, humidity: 74, windSpeed: 13, cloudCover: 72, label: 1 },
        { temperature: 36, humidity: 40, windSpeed: 9, cloudCover: 25, label: 0 },
        { temperature: 26, humidity: 95, windSpeed: 22, cloudCover: 98, label: 1 },
        { temperature: 34, humidity: 48, windSpeed: 7, cloudCover: 30, label: 0 },
        { temperature: 30, humidity: 62, windSpeed: 9, cloudCover: 45, label: 0 },
        { temperature: 29, humidity: 86, windSpeed: 17, cloudCover: 90, label: 1 },
        { temperature: 38, humidity: 33, windSpeed: 6, cloudCover: 15, label: 0 },
        { temperature: 25, humidity: 89, windSpeed: 19, cloudCover: 93, label: 1 }
    ];

    const features = raw.map((sample) => [
        sample.temperature,
        sample.humidity,
        sample.windSpeed,
        sample.cloudCover
    ]);
    const labels = raw.map((sample) => [sample.label]);

    featureStats = buildFeatureStats(features);
    const normalizedFeatures = normalizeFeatures(features, featureStats);

    return {
        xs: tf.tensor2d(normalizedFeatures),
        ys: tf.tensor2d(labels)
    };
}

function createModel() {
    const nextModel = tf.sequential();

    nextModel.add(tf.layers.dense({ inputShape: [4], units: 12, activation: "relu" }));
    nextModel.add(tf.layers.dense({ units: 8, activation: "relu" }));
    nextModel.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

    nextModel.compile({
        optimizer: tf.train.adam(0.03),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"]
    });

    return nextModel;
}

async function trainModel() {
    const { xs, ys } = loadData();
    model = createModel();

    console.log("Rain model training started...");

    await model.fit(xs, ys, {
        epochs: 160,
        batchSize: 4,
        shuffle: true,
        verbose: 0
    });

    xs.dispose();
    ys.dispose();

    console.log("Rain model training completed");
}

function buildRainMessage(score) {
    if (score >= 0.72) {
        return "High chance of rain";
    }

    if (score >= 0.45) {
        return "Possible rain";
    }

    return "Low chance of rain";
}

function buildRainSummary(score) {
    if (score >= 0.72) {
        return "The air looks humid, the clouds are heavy, and the pattern points toward rainfall.";
    }

    if (score >= 0.45) {
        return "Some weather signals are leaning rainy, but the forecast is not fully locked in.";
    }

    return "The current weather mix looks fairly stable, so rain is less likely right now.";
}

rnml.get("/train", async (req, res) => {
    await trainModel();
    res.redirect("/rnml/predict");
});

rnml.get("/", (req, res) => {
    res.redirect("/rnml/predict");
});

rnml.get("/predict", (req, res) => {
    res.render("rainPredict");
});

rnml.get("/pridict", (req, res) => {
    res.redirect("/rnml/predict");
});

rnml.post("/predict", async (req, res) => {
    try {
        if (!model) {
            await trainModel();
        }

        const temperature = normalizeInput(req.body.temperature);
        const humidity = normalizeInput(req.body.humidity);
        const windSpeed = normalizeInput(req.body.windSpeed);
        const cloudCover = normalizeInput(req.body.cloudCover);

        if ([temperature, humidity, windSpeed, cloudCover].some((value) => value === null)) {
            return res.status(400).json({
                error: "Please enter valid numbers for temperature, humidity, wind speed, and cloud cover."
            });
        }

        const normalizedRow = normalizeFeatures([[temperature, humidity, windSpeed, cloudCover]], featureStats);
        const input = tf.tensor2d(normalizedRow);
        const prediction = model.predict(input);
        const result = await prediction.data();

        input.dispose();
        prediction.dispose();

        const score = result[0];

        res.json({
            score,
            result: buildRainMessage(score),
            summary: buildRainSummary(score),
            details: {
                temperature,
                humidity,
                windSpeed,
                cloudCover
            }
        });
    } catch (err) {
        console.error("Rain prediction error:", err);
        res.status(500).json({
            error: "Rain prediction failed."
        });
    }
});


rnml.get('/current/:city', async (req, res) => {

  const {temperature, humidity, windSpeed, cloudCover}=fetchCurrentWeather(req.params.city);

  try{

    const normalizedRow = normalizeFeatures([[temperature, humidity, windSpeed, cloudCover]], featureStats);
    const input = tf.tensor2d(normalizedRow);
    const prediction = model.predict(input);
    const result = await prediction.data();

    input.dispose();
    prediction.dispose();
    const score = result[0];

    res.json({
        score,
        result: buildRainMessage(score),
        summary: buildRainSummary(score),
        details: {
            temperature,
            humidity,
            windSpeed,
            cloudCover
        }
    });
   }catch (err) {
    console.error("Rain prediction error:", err);
    res.status(500).json({
        error: "Rain prediction failed."
    });
}
});

async function fetchCurrentWeather(city) {
    const API_KEY = "YOUR_API_KEY";
    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();

    return {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        cloudCover: data.clouds.all
    };
    
}
export default rnml;

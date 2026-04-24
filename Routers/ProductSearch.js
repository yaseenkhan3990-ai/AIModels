import express from "express";
import * as tf from "@tensorflow/tfjs";

const tfml = express.Router();
let dealModel;
let featureStats;
let trainingPromise;

const DEAL_DATASET = [
    { price: 349, discount: 34, sale: 980, rating: 4.8, label: 0.97 },
    { price: 499, discount: 29, sale: 860, rating: 4.7, label: 0.92 },
    { price: 699, discount: 22, sale: 720, rating: 4.6, label: 0.84 },
    { price: 899, discount: 18, sale: 640, rating: 4.4, label: 0.73 },
    { price: 1099, discount: 16, sale: 520, rating: 4.2, label: 0.61 },
    { price: 1299, discount: 12, sale: 420, rating: 4.0, label: 0.49 },
    { price: 1499, discount: 9, sale: 300, rating: 3.9, label: 0.36 },
    { price: 1799, discount: 7, sale: 210, rating: 3.7, label: 0.24 },
    { price: 599, discount: 10, sale: 180, rating: 3.6, label: 0.28 },
    { price: 749, discount: 15, sale: 350, rating: 4.1, label: 0.48 },
    { price: 829, discount: 24, sale: 560, rating: 4.5, label: 0.76 },
    { price: 999, discount: 27, sale: 700, rating: 4.7, label: 0.89 },
    { price: 1199, discount: 30, sale: 820, rating: 4.9, label: 0.95 },
    { price: 1399, discount: 20, sale: 610, rating: 4.3, label: 0.67 },
    { price: 1599, discount: 14, sale: 455, rating: 4.1, label: 0.53 },
    { price: 1899, discount: 11, sale: 390, rating: 4.0, label: 0.42 }
];

function normalizeInput(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
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
    const features = DEAL_DATASET.map((product) => [
        product.price,
        product.discount,
        product.sale,
        product.rating
    ]);
    const labels = DEAL_DATASET.map((product) => [product.label]);

    featureStats = buildFeatureStats(features);

    return {
        xs: tf.tensor2d(normalizeFeatures(features, featureStats)),
        ys: tf.tensor2d(labels)
    };
}

function createModel() {
    const nextModel = tf.sequential();

    nextModel.add(tf.layers.dense({ inputShape: [4], units: 16, activation: "relu" }));
    nextModel.add(tf.layers.dense({ units: 8, activation: "relu" }));
    nextModel.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    nextModel.compile({
        optimizer: tf.train.adam(0.03),
        loss: "meanSquaredError",
        metrics: ["mse"]
    });

    return nextModel;
}

async function trainModel(force = false) {
    if (trainingPromise) {
        return trainingPromise;
    }

    if (force && dealModel) {
        dealModel.dispose();
        dealModel = null;
    }

    if (dealModel) {
        return;
    }

    const { xs, ys } = loadData();
    dealModel = createModel();

    trainingPromise = dealModel.fit(xs, ys, {
        epochs: 220,
        batchSize: 4,
        shuffle: true,
        verbose: 0
    });

    await trainingPromise;

    xs.dispose();
    ys.dispose();
    trainingPromise = null;
}

function buildDealMessage(score) {
    if (score >= 0.8) {
        return "Excellent deal";
    }

    if (score >= 0.55) {
        return "Good deal";
    }

    if (score >= 0.35) {
        return "Average deal";
    }

    return "Weak deal";
}

function buildDealSummary({ price, discount, sale, rating, score }) {
    const points = [
        `price is ${price}`,
        `discount is ${discount}%`,
        `sales count is ${sale}`,
        `rating is ${rating}`
    ];

    if (score >= 0.8) {
        return `The TensorFlow model sees a very strong deal because ${points.join(", ")} and the combined pattern is close to the best training examples.`;
    }

    if (score >= 0.55) {
        return `The TensorFlow model sees a solid deal because ${points.join(", ")} and the product pattern is better than most average examples.`;
    }

    if (score >= 0.35) {
        return `The TensorFlow model sees a mixed deal because ${points.join(", ")} and some signals are strong while others are only moderate.`;
    }

    return `The TensorFlow model sees a weak deal because ${points.join(", ")} and the pattern is far from the best-performing examples in the training data.`;
}

tfml.get("/train", async (req, res) => {
    await trainModel();
    res.redirect("/ml/predict");
});

tfml.post("/train", async (req, res) => {
    try {
        await trainModel(true);
        return res.json({
            message: "TensorFlow model trained successfully."
        });
    } catch (error) {
        console.error("Training error:", error);
        return res.status(500).json({
            error: "Model training failed."
        });
    }
});

tfml.get("/", (req, res) => {
    res.redirect("/ml/predict");
});

tfml.get("/predict", (req, res) => {
    res.render("predict");
});

tfml.get("/pridict", (req, res) => {
    res.redirect("/ml/predict");
});

tfml.post("/predict", async (req, res) => {
    try {
        if (!dealModel) {
            await trainModel();
        }

        const price = normalizeInput(req.body.price);
        const discount = normalizeInput(req.body.discount);
        const rating = normalizeInput(req.body.rating);
        const sale = normalizeInput(req.body.sale);

        if ([price, discount, rating, sale].some((value) => value === null)) {
            return res.status(400).json({
                error: "Please enter valid numbers for price, discount, rating, and sale count."
            });
        }

        const normalizedRow = normalizeFeatures([[price, discount, sale, rating]], featureStats);
        const input = tf.tensor2d(normalizedRow);
        const prediction = dealModel.predict(input);
        const result = await prediction.data();

        input.dispose();
        prediction.dispose();

        const score = result[0];

        return res.json({
            score,
            result: buildDealMessage(score),
            summary: buildDealSummary({ price, discount, sale, rating, score }),
            details: {
                price,
                discount,
                sale,
                rating
            }
        });
    } catch (err) {
        console.error("Prediction error:", err);
        return res.status(500).json({
            error: "Prediction error"
        });
    }
});

export default tfml;

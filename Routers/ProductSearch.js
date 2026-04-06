import express from "express";
import * as tf from "@tensorflow/tfjs";

const tfml = express.Router();
let model;

function normalizeInput(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function loadData() {
    const raw = [
        { price: 500, discount: 30, rating: 4.5, stock: 100, label: 1 },
        { price: 1000, discount: 5, rating: 3.0, stock: 50, label: 0 },
        { price: 300, discount: 25, rating: 4.2, stock: 80, label: 1 },
        { price: 1200, discount: 10, rating: 3.5, stock: 20, label: 0 }
    ];

    const features = raw.map((product) => [
        product.price,
        product.discount,
        product.rating,
        product.stock
    ]);
    const labels = raw.map((product) => [product.label]);

    return {
        xs: tf.tensor2d(features),
        ys: tf.tensor2d(labels)
    };
}

function createModel() {
    const nextModel = tf.sequential();

    nextModel.add(tf.layers.dense({ inputShape: [4], units: 16, activation: "relu" }));
    nextModel.add(tf.layers.dense({ units: 8, activation: "relu" }));
    nextModel.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
    nextModel.compile({
        optimizer: "adam",
        loss: "binaryCrossentropy",
        metrics: ["accuracy"]
    });
    return nextModel;
}

async function trainModel() {
    const { xs, ys } = loadData();
    model = createModel();

    console.log("Training started...");

    await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 2,
        callbacks: {
            onEpochEnd: (epoch, logs = {}) => {
                const accuracy = logs.acc ?? logs.accuracy;
                console.log(
                    `Epoch ${epoch + 1}: loss=${logs.loss?.toFixed(4) ?? "n/a"}, accuracy=${accuracy?.toFixed(4) ?? "n/a"}`
                );
            }
        }
    });

    xs.dispose();
    ys.dispose();

    console.log("Training completed");
}

tfml.get("/train", async (req, res) => {
    await trainModel();
    res.redirect("predict");
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
        if (!model) {
            await trainModel();
        }

        const price = normalizeInput(req.body.price);
        const discount = normalizeInput(req.body.discount);
        const rating = normalizeInput(req.body.rating);
        const stock = normalizeInput(req.body.stock);

        if ([price, discount, rating, stock].some((value) => value === null)) {
            return res.status(400).json({
                error: "Please enter valid numbers for price, discount, rating, and stock."
            });
        }

        const input = tf.tensor2d([[price, discount, rating, stock]]);
        const prediction = model.predict(input);
        const result = await prediction.data();
        
        input.dispose();
        prediction.dispose();
        const score = result[0];
     
        res.json({
            score,
            result: score > 0.5 ? "Good Deal" : "Not a good deal"
        });
    } catch (err) {
        console.error("Prediction error:", err);
        res.status(500).json({
            error: "Prediction error"
        });
    }
});

export default tfml;

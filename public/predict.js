const predictForm = document.getElementById("predictForm");
const submitBtn = document.getElementById("submitBtn");
const trainBtn = document.getElementById("trainBtn");
const statusText = document.getElementById("statusText");
const resultCard = document.getElementById("resultCard");
const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const resultSummary = document.getElementById("resultSummary");
const scoreFill = document.getElementById("scoreFill");
const scoreValue = document.getElementById("scoreValue");
const heroIcon = document.getElementById("heroIcon");

let submissionInFlight = false;
let trainingInFlight = false;

function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Searching..." : "Find Product";
    if (isLoading) {
        statusText.textContent = "Training TensorFlow deal model and scoring the product...";
    }
    heroIcon.textContent = isLoading ? "\u23F3" : heroIcon.textContent;
}

function showResult({ score, result, summary, details = {} }) {
    const percentage = Math.max(0, Math.min(100, score * 100));
    const isStrongMatch = score >= 0.7;
    const metricText = details.price !== undefined
        ? ` Price: ${details.price}, Discount: ${details.discount}%, Sales: ${details.sale}, Rating: ${details.rating}.`
        : "";

    resultCard.classList.remove("good", "bad");
    resultCard.classList.add("visible", isStrongMatch ? "good" : "bad");

    resultBadge.textContent = isStrongMatch ? "\uD83C\uDFAF" : "\uD83D\uDD0D";
    resultTitle.textContent = result;
    resultSummary.textContent = `${summary}${metricText}`;
    scoreFill.style.width = `${percentage.toFixed(2)}%`;
    scoreValue.textContent = `${percentage.toFixed(2)}%`;
    statusText.textContent = "Deal search completed with TensorFlow scoring.";
    heroIcon.textContent = isStrongMatch ? "\uD83C\uDFAF" : "\uD83D\uDD0D";
}

function showError(message) {
    resultCard.classList.remove("good", "bad");
    resultCard.classList.add("visible", "bad");
    resultBadge.textContent = "\u274C";
    resultTitle.textContent = "Could not predict";
    resultSummary.textContent = message;
    scoreFill.style.width = "0%";
    scoreValue.textContent = "0.00%";
    statusText.textContent = message;
    heroIcon.textContent = "\uD83E\uDD72";
}

async function trainModel() {
    if (trainingInFlight) {
        return;
    }

    trainingInFlight = true;
    trainBtn.disabled = true;
    trainBtn.textContent = "Training...";
    statusText.textContent = "Training TensorFlow model...";
    heroIcon.textContent = "\u2699\uFE0F";

    try {
        const response = await fetch("/ml/train", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Training failed.");
        }

        statusText.textContent = data.message || "Model training completed.";
        heroIcon.textContent = "\u2705";
    } catch (error) {
        showError(error.message || "Training failed.");
    } finally {
        trainingInFlight = false;
        trainBtn.disabled = false;
        trainBtn.textContent = "Train Model";
    }
}

trainBtn.addEventListener("click", async () => {
    await trainModel();
});

predictForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submissionInFlight) {
        return;
    }

    const formData = new FormData(predictForm);
    const payload = Object.fromEntries(formData.entries());

    submissionInFlight = true;
    setLoadingState(true);

    try {
        const response = await fetch("/ml/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Prediction failed.");
        }

        showResult(data);
    } catch (error) {
        showError(error.message || "Prediction failed.");
    } finally {
        submissionInFlight = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Find Product";
        if (heroIcon.textContent === "\u23F3") {
            heroIcon.textContent = "\uD83D\uDED5\uFE0F";
        }
    }
});

const predictForm = document.getElementById("predictForm");
const submitBtn = document.getElementById("submitBtn");
const statusText = document.getElementById("statusText");
const resultCard = document.getElementById("resultCard");
const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const resultSummary = document.getElementById("resultSummary");
const scoreFill = document.getElementById("scoreFill");
const scoreValue = document.getElementById("scoreValue");
const heroIcon = document.getElementById("heroIcon");

let submissionInFlight = false;

function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Checking..." : "Predict Deal";
    if (isLoading) {
        statusText.textContent = "Running the prediction model...";
    }
    heroIcon.textContent = isLoading ? "\u23F3" : heroIcon.textContent;
}

function showResult({ score, result }) {
    const percentage = Math.max(0, Math.min(100, score * 100));
    const isGoodDeal = score > 0.5;

    resultCard.classList.remove("good", "bad");
    resultCard.classList.add("visible", isGoodDeal ? "good" : "bad");

    resultBadge.textContent = isGoodDeal ? "\uD83D\uDD25" : "\u26A0\uFE0F";
    resultTitle.textContent = result;
    resultSummary.textContent = isGoodDeal
        ? `This looks promising with a model score of ${percentage.toFixed(2)}%. Higher discount, stronger rating, and healthier stock helped this result.`
        : `This looks weaker with a model score of ${percentage.toFixed(2)}%. The current mix of price, discount, rating, and stock did not look attractive enough.`;
    scoreFill.style.width = `${percentage.toFixed(2)}%`;
    scoreValue.textContent = `${percentage.toFixed(2)}%`;
    statusText.textContent = "Prediction completed.";
    heroIcon.textContent = isGoodDeal ? "\uD83D\uDD25" : "\uD83E\uDDFE";
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
        submitBtn.textContent = "Predict Deal";
        if (heroIcon.textContent === "\u23F3") {
            heroIcon.textContent = "\uD83D\uDED5\uFE0F";
        }
    }
});

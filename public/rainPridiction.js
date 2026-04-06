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
const detailTemperature = document.getElementById("detailTemperature");
const detailHumidity = document.getElementById("detailHumidity");
const detailWindSpeed = document.getElementById("detailWindSpeed");
const detailCloudCover = document.getElementById("detailCloudCover");

let submissionInFlight = false;

function setLoadingState(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Checking..." : "Predict Rain";
    if (isLoading) {
        statusText.textContent = "Studying the weather pattern...";
    }
    heroIcon.textContent = isLoading ? "\u23F3" : heroIcon.textContent;
}

function updateDetails(details = {}) {
    detailTemperature.textContent = details.temperature != null ? `${details.temperature}\u00B0C` : "--";
    detailHumidity.textContent = details.humidity != null ? `${details.humidity}%` : "--";
    detailWindSpeed.textContent = details.windSpeed != null ? `${details.windSpeed} km/h` : "--";
    detailCloudCover.textContent = details.cloudCover != null ? `${details.cloudCover}%` : "--";
}

function showResult({ score, result, summary, details }) {
    const percentage = Math.max(0, Math.min(100, score * 100));
    let cardState = "clear";
    let badgeIcon = "\u2600\uFE0F";
    let heroState = "\u2600\uFE0F";

    if (score >= 0.72) {
        cardState = "rain";
        badgeIcon = "\uD83C\uDF27\uFE0F";
        heroState = "\uD83C\uDF27\uFE0F";
    } else if (score >= 0.45) {
        cardState = "maybe";
        badgeIcon = "\u26C5";
        heroState = "\u26C5";
    }

    resultCard.classList.remove("rain", "maybe", "clear");
    resultCard.classList.add("visible", cardState);

    resultBadge.textContent = badgeIcon;
    resultTitle.textContent = result;
    resultSummary.textContent = summary || "Forecast ready.";
    scoreFill.style.width = `${percentage.toFixed(2)}%`;
    scoreValue.textContent = `${percentage.toFixed(2)}%`;
    updateDetails(details);
    statusText.textContent = "Forecast ready.";
    heroIcon.textContent = heroState;
}

function showError(message) {
    resultCard.classList.remove("rain", "maybe", "clear");
    resultCard.classList.add("visible", "maybe");
    resultBadge.textContent = "\u274C";
    resultTitle.textContent = "Could not predict rain";
    resultSummary.textContent = message;
    scoreFill.style.width = "0%";
    scoreValue.textContent = "0.00%";
    updateDetails();
    statusText.textContent = message;
    heroIcon.textContent = "\u2601\uFE0F";
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
        const response = await fetch("/rnml/predict", {
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
        submitBtn.textContent = "Predict Rain";
        if (heroIcon.textContent === "\u23F3") {
            heroIcon.textContent = "\u2601\uFE0F";
        }
    }
});

async function getPrediction() {
  const city = document.getElementById("citySelect").value;

  try {
    const response = await fetch(`http://localhost:3000/predict/${city}`);
    const data = await response.json();

    document.getElementById("result").innerHTML = `
       Temp: ${data.weather.temperature}°C <br>
       Humidity: ${data.weather.humidity}% <br>
       Cloud: ${data.weather.cloudCover}% <br><br>
       ${data.prediction} (${(data.rainProbability * 100).toFixed(2)}%)
    `;
    showResult(data);
  } catch (error) {
    document.getElementById("result").innerText = "Error fetching data";
    console.error(error);
  }
}

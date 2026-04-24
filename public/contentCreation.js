const form = document.getElementById("contentForm");
const videoInput = document.getElementById("videoInput");
const videoPreview = document.getElementById("videoPreview");
const placeholder = document.getElementById("previewPlaceholder");

const statusText = document.getElementById("statusText");
const resultsContent = document.getElementById("resultsContent");
const emptyState = document.getElementById("emptyState");

// Preview video
videoInput.addEventListener("change", () => {
  const file = videoInput.files[0];

  if (file) {
    const url = URL.createObjectURL(file);
    videoPreview.src = url;
    videoPreview.classList.add("active");
    placeholder.classList.add("hidden");
  }
});

// Submit form
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = videoInput.files[0];
  if (!file) {
    alert("Upload a file");
    return;
  }

  const formData = new FormData();
  formData.append("video", file);

  try {
    statusText.textContent = "Processing video...";
    resultsContent.hidden = true;

    const res = await fetch("/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    // Show results
    emptyState.style.display = "none";
    resultsContent.hidden = false;

    // Fill UI
    document.getElementById("analysisSummary").textContent = data.summary || "";
    document.getElementById("analysisHook").textContent = data.hook || "";
    document.getElementById("analysisSpoken").textContent = data.spoken || "";
    document.getElementById("analysisVisual").textContent = data.visual || "";
    document.getElementById("analysisPerformance").textContent = data.performance || "";

    document.getElementById("youtubeTitle").textContent = data.youtube_title || "";
    document.getElementById("instagramCaption").textContent = data.instagram_caption || "";

    document.getElementById("transcriptBox").textContent = data.transcript || "";

    document.getElementById("jsonOutput").textContent = JSON.stringify(data, null, 2);

    statusText.textContent = "Done ✅";
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error ❌";
  }
});

// Reset button
document.getElementById("resetBtn").addEventListener("click", () => {
  form.reset();
  videoPreview.classList.remove("active");
  placeholder.classList.remove("hidden");
  resultsContent.hidden = true;
  emptyState.style.display = "block";
  statusText.textContent = "Cleared";
});

// Copy buttons
document.querySelectorAll(".copyBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.copyTarget;

    let text = "";

    if (type === "youtube") {
      text = document.getElementById("youtubeTitle").textContent;
    }

    if (type === "instagram") {
      text = document.getElementById("instagramCaption").textContent;
    }

    if (type === "facebook") {
      text = document.getElementById("facebookCaption")?.textContent || "";
    }

    navigator.clipboard.writeText(text);
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
});
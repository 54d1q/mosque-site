document.addEventListener("DOMContentLoaded", () => {
  // Check URL if a specific video was requested
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get("id");

  if (videoId) {
    loadDetail(videoId);
  } else {
    loadGrid();
  }
});

// Helper: Extract YouTube ID
function getYouTubeID(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// 1. Load Grid View
async function loadGrid() {
  document.getElementById("grid-view").style.display = "block";
  document.getElementById("detail-view").style.display = "none";

  // Clean URL
  window.history.pushState({}, "", window.location.pathname);

  const container = document.getElementById("video-grid-container");

  try {
    const res = await fetch("/api/videos");
    const videos = await res.json();

    if (videos.length === 0) {
      container.innerHTML = "<p>No videos available.</p>";
      return;
    }

    container.innerHTML = videos
      .map((vid) => {
        const ytId = getYouTubeID(vid.video_url);
        const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        const date = new Date(vid.created_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return `
        <div class="video-card">
          <div class="thumb-wrapper" onclick="openDetail(${vid.id})">
            <img src="${thumb}" alt="${vid.title}">
            <div class="play-icon"></div>
          </div>
          <div class="card-body">
            <h3>${vid.title}</h3>
            <span class="card-date">${date}</span>
            <p class="card-text">${vid.summary}</p>
            <button class="read-more-btn" onclick="openDetail(${vid.id})">Read more</button>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading content.</p>";
  }
}

// 2. Open Detail View (When 'Read more' clicked)
function openDetail(id) {
  loadDetail(id);
  const newUrl = window.location.pathname + `?id=${id}`;
  window.history.pushState({ path: newUrl }, "", newUrl);
}

// 3. Load Detail Content
async function loadDetail(id) {
  document.getElementById("grid-view").style.display = "none";
  document.getElementById("detail-view").style.display = "block";

  try {
    const res = await fetch(`/api/videos/${id}`);
    const vid = await res.json();

    const ytId = getYouTubeID(vid.video_url);
    const date = new Date(vid.created_at).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

    // Auto-play enabled
    document.getElementById(
      "detail-iframe"
    ).src = `https://www.youtube.com/embed/${ytId}?autoplay=1`;

    document.getElementById("detail-title").innerText = vid.title;
    document.getElementById("breadcrumb-title").innerText = vid.title;
    document.getElementById("detail-date").innerText = date;
    document.getElementById("detail-desc").innerHTML = vid.description.replace(
      /\n/g,
      "<br>"
    );

    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
  }
}

// 4. Back Button Logic
function showGrid(e) {
  if (e) e.preventDefault();
  // Stop video playback
  document.getElementById("detail-iframe").src = "";
  loadGrid();
}

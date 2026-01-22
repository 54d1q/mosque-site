document.addEventListener("DOMContentLoaded", () => {
  loadVideos();

  document
    .getElementById("add-video-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        title: document.getElementById("vid-title").value,
        video_url: document.getElementById("vid-url").value,
        summary: document.getElementById("vid-summary").value,
        description: document.getElementById("vid-desc").value,
      };

      try {
        const res = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          alert("Video Added Successfully!");
          e.target.reset();
          loadVideos();
        } else {
          alert("Error adding video");
        }
      } catch (err) {
        console.error(err);
        alert("Server Error");
      }
    });
});

async function loadVideos() {
  const container = document.getElementById("video-list");
  try {
    const res = await fetch("/api/videos");
    const videos = await res.json();

    if (videos.length === 0) {
      container.innerHTML = "<p>No videos uploaded yet.</p>";
      return;
    }

    container.innerHTML = videos
      .map(
        (vid) => `
      <div class="video-list-item">
        <div class="video-content">
          <h4>${vid.title}</h4>
          <p>${vid.summary}</p>
          <a href="${vid.video_url}" target="_blank" class="video-link">Watch Link</a>
        </div>
        <button class="btn-delete" onclick="deleteVideo(${vid.id})">Delete</button>
      </div>
    `
      )
      .join("");
  } catch (err) {
    container.innerHTML = "<p>Error loading videos.</p>";
  }
}

async function deleteVideo(id) {
  if (confirm("Are you sure you want to delete this video?")) {
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    loadVideos();
  }
}

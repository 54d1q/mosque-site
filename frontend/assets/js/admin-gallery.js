document.addEventListener("DOMContentLoaded", () => {
  loadImages();

  document
    .getElementById("add-image-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const fileInput = document.getElementById("gallery-file");
      const captionInput = document.getElementById("gallery-caption");
      const typeInput = document.getElementById("gallery-type"); // Get Dropdown

      if (!fileInput.files[0]) {
        alert("Please select an image.");
        return;
      }

      const formData = new FormData();
      formData.append("imageFile", fileInput.files[0]);
      formData.append("caption", captionInput.value);
      formData.append("category", typeInput.value); // Send Category

      try {
        const res = await fetch("/api/gallery", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          alert("Image Uploaded!");
          e.target.reset();
          loadImages();
        } else {
          alert("Upload failed.");
        }
      } catch (err) {
        console.error(err);
        alert("Server Error");
      }
    });
});

async function loadImages() {
  const container = document.getElementById("gallery-list");
  try {
    const res = await fetch("/api/gallery");
    const images = await res.json();

    if (images.length === 0) {
      container.innerHTML = "<p>No images found.</p>";
      return;
    }

    container.innerHTML = images
      .map(
        (img) => `
      <div class="video-list-item" style="align-items: center;">
        <img src="${
          img.image_url
        }" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
        <div class="video-content" style="flex: 1; margin-left: 15px;">
          <span style="font-size:0.7rem; font-weight:bold; color:white; background:${
            img.category === "leaflet" ? "#e67e22" : "#1e4d2b"
          }; padding:2px 6px; border-radius:4px;">
            ${img.category === "leaflet" ? "LEAFLET" : "GALLERY"}
          </span>
          <h4 style="margin-top:4px;">${img.caption || "No Caption"}</h4>
        </div>
        <button class="btn-delete" onclick="deleteImage(${
          img.id
        })">Delete</button>
      </div>
    `
      )
      .join("");
  } catch (err) {
    container.innerHTML = "<p>Error loading images.</p>";
  }
}

async function deleteImage(id) {
  if (confirm("Delete this image?")) {
    await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    loadImages();
  }
}

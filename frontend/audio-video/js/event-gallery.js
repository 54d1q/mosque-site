// State for both carousels
const carousels = {
  gallery: { slides: [], current: 0, interval: null, id: "carousel-track" },
  leaflet: { slides: [], current: 0, interval: null, id: "leaflets-track" },
};

document.addEventListener("DOMContentLoaded", () => {
  loadGalleryData();
});

async function loadGalleryData() {
  try {
    const res = await fetch("/api/gallery");
    const allImages = await res.json();

    // Filter images
    const galleryImages = allImages.filter(
      (img) => img.category === "gallery" || !img.category
    );
    const leafletImages = allImages.filter((img) => img.category === "leaflet");

    // Initialize Left Carousel
    initCarousel("gallery", galleryImages);

    // Initialize Right Carousel
    initCarousel("leaflet", leafletImages);
  } catch (err) {
    console.error(err);
  }
}

function initCarousel(type, images) {
  const container = document.getElementById(carousels[type].id);
  carousels[type].slides = images;

  if (images.length === 0) {
    container.innerHTML =
      '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#888;">No images available.</div>';
    return;
  }

  // Render Slides
  container.innerHTML = images
    .map(
      (img, index) => `
    <div class="slide ${
      index === 0 ? "active" : ""
    }" id="${type}-slide-${index}">
      <img src="${img.image_url}" alt="Image">
      ${
        img.caption
          ? `<div class="${
              type === "leaflet" ? "leaflet-caption" : "slide-caption"
            }">${img.caption}</div>`
          : ""
      }
    </div>
  `
    )
    .join("");

  // Start Auto-play
  startSlideShow(type);
}

// Show specific slide for a specific carousel type
function showSlide(type, index) {
  const state = carousels[type];
  const slides = state.slides;

  if (slides.length === 0) return;

  // Wrap around logic
  if (index >= slides.length) state.current = 0;
  else if (index < 0) state.current = slides.length - 1;
  else state.current = index;

  // Toggle classes manually for performance
  // We need to find the slide elements within the specific container
  const container = document.getElementById(state.id);
  const slideElements = container.getElementsByClassName("slide");

  for (let i = 0; i < slideElements.length; i++) {
    slideElements[i].classList.remove("active");
    if (i === state.current) slideElements[i].classList.add("active");
  }
}

// Navigation Functions
function nextSlide(type) {
  showSlide(type, carousels[type].current + 1);
  resetTimer(type);
}

function prevSlide(type) {
  showSlide(type, carousels[type].current - 1);
  resetTimer(type);
}

// Timer Logic
function startSlideShow(type) {
  // Use different intervals to make them look less robotic (e.g. 5s vs 6s)
  const time = type === "gallery" ? 5000 : 6500;
  carousels[type].interval = setInterval(() => {
    showSlide(type, carousels[type].current + 1);
  }, time);
}

function resetTimer(type) {
  clearInterval(carousels[type].interval);
  startSlideShow(type);
}

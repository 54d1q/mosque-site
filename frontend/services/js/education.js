document.addEventListener("DOMContentLoaded", async () => {
  const admissionModal = document.getElementById("admission-modal");
  const termsModal = document.getElementById("terms-modal");
  const successOverlay = document.getElementById("success-overlay");
  const admissionForm = document.getElementById("admission-form");

  // Close logic
  document.querySelectorAll(".close-x, .btn-home").forEach((btn) => {
    btn.onclick = () => {
      if (admissionModal) admissionModal.style.display = "none";
      if (termsModal) termsModal.style.display = "none";
      if (successOverlay) successOverlay.classList.remove("active");
    };
  });

  // Populate Levels (Same as before)
  const levelSelect = document.getElementById("adm-level");
  if (levelSelect) {
    const res = await fetch("/api/levels");
    const levels = await res.json();
    levels.forEach((lvl) => {
      levelSelect.innerHTML += `<option value="${lvl.name}">${lvl.name}</option>`;
    });
  }

  // Submit logic (Keep your existing FETCH code here exactly as is)
  if (admissionForm) {
    admissionForm.addEventListener("submit", async (e) => {
      // ... copy your existing handleSubmit logic here ...
    });
  }
});

// Helper Functions for Buttons
function openAdmissionModal() {
  document.getElementById("admission-modal").style.display = "flex";
}
function openTermsModal() {
  document.getElementById("terms-modal").style.display = "flex";
}
function closeTermsModal() {
  document.getElementById("terms-modal").style.display = "none";
}

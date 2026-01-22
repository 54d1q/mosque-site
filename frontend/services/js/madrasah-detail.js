document.addEventListener("DOMContentLoaded", async () => {
  const admissionModal = document.getElementById("admission-modal");
  const termsModal = document.getElementById("terms-modal");
  const successOverlay = document.getElementById("success-overlay");
  const admissionForm = document.getElementById("admission-form");

  // Populate Levels
  const levelSelect = document.getElementById("adm-level");
  if (levelSelect) {
    try {
      const res = await fetch("/api/levels");

      // Check to prevent the SyntaxError if the server sends HTML instead of JSON
      const contentType = res.headers.get("content-type");
      if (
        !res.ok ||
        !contentType ||
        !contentType.includes("application/json")
      ) {
        throw new Error("Server did not return JSON.");
      }

      const levels = await res.json();
      levelSelect.innerHTML = '<option value="">-- Select Level --</option>';
      levels.forEach((lvl) => {
        levelSelect.innerHTML += `<option value="${lvl.name}">${lvl.name}</option>`;
      });
    } catch (err) {
      console.error("Error loading levels:", err);
      levelSelect.innerHTML = '<option value="">Error loading levels</option>';
    }
  }

  // Handle Form Submit
  if (admissionForm) {
    admissionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      btn.innerText = "Submitting...";
      btn.disabled = true;

      const data = {
        firstName: document.getElementById("adm-first-name").value,
        lastName: document.getElementById("adm-last-name").value,
        gender: document.getElementById("adm-gender").value,
        level: document.getElementById("adm-level").value,
        dob: document.getElementById("adm-dob").value,
        parentName: document.getElementById("adm-parent-name").value,
        addressLine1: document.getElementById("adm-address-line1").value,
        city: document.getElementById("adm-city").value,
        postcode: document.getElementById("adm-postcode").value,
        homePhone: document.getElementById("adm-home-phone").value,
        mobilePhone: document.getElementById("adm-mobile-phone").value,
        emergencyPhone: document.getElementById("adm-emergency-phone").value,
        email: document.getElementById("adm-email").value,
        medicalInfo: document.getElementById("adm-medical-info").value,
        doctorDetails: document.getElementById("adm-doctor-details").value,
      };

      try {
        const res = await fetch("/api/submit-admission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          admissionModal.style.display = "none";
          successOverlay.classList.add("active");
          admissionForm.reset();
        } else {
          alert("Error submitting application.");
        }
      } catch (err) {
        alert("Server error.");
      } finally {
        btn.innerText = "Submit Application";
        btn.disabled = false;
      }
    });
  }
});

function openAdmissionModal() {
  document.getElementById("admission-modal").style.display = "flex";
}
function closeAdmissionModal() {
  document.getElementById("admission-modal").style.display = "none";
}
function openTermsModal() {
  document.getElementById("terms-modal").style.display = "flex";
}
function closeTermsModal() {
  document.getElementById("terms-modal").style.display = "none";
}

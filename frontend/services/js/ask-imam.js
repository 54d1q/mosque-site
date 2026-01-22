document.addEventListener("DOMContentLoaded", () => {
  loadPublicFAQs();

  const form = document.getElementById("ask-imam-form");
  if (form) {
    form.addEventListener("submit", handleQuestionSubmit);
  }
});

// Accordion Logic
function attachAccordionListeners() {
  const questions = document.querySelectorAll(".faq-question");

  questions.forEach((question) => {
    question.addEventListener("click", () => {
      // Toggle Active Class
      question.classList.toggle("active");

      // Toggle Panel
      const answer = question.nextElementSibling;
      const icon = question.querySelector(".icon");

      if (answer.style.maxHeight) {
        answer.style.maxHeight = null;
        icon.innerText = "+";
      } else {
        answer.style.maxHeight = answer.scrollHeight + "px";
        icon.innerText = "-";
      }
    });
  });
}

// Submit Question Logic
async function handleQuestionSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector("button");
  const originalText = btn.innerText;
  btn.disabled = true;
  btn.innerText = "Sending...";

  const formData = {
    name: e.target.name.value,
    email: e.target.email.value,
    question: e.target.question.value,
    private: document.getElementById("private-check").checked,
  };

  try {
    const res = await fetch("/api/ask-imam", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      alert("Jazakallah! Your question has been sent to the Imam.");
      e.target.reset();
    } else {
      alert("Error sending question. Please try again.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error.");
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}
// Load FAQs from API
async function loadPublicFAQs() {
  const container =
    document.querySelector(".faq-container") ||
    document.querySelector(".ai-faq-container");
  if (!container) return;

  try {
    const res = await fetch("/api/faqs");
    const faqs = await res.json();

    if (faqs.length === 0) {
      container.innerHTML =
        "<p style='text-align:center'>No frequently asked questions available yet.</p>";
      return;
    }

    let html = "";
    faqs?.forEach((faq) => {
      html += `
        <div class="faq-item">
          <button class="faq-question">
            ${faq.question} <span class="icon">+</span>
          </button>
          <div class="faq-answer">
            <p>${faq.answer}</p>
          </div>
        </div>`;
    });

    container.innerHTML = html;

    // Attach click listeners to new elements
    attachAccordionListeners();
  } catch (err) {
    console.error("Error loading FAQs:", err);
    container.innerHTML =
      "<p style='text-align:center; color:red;'>Unable to load FAQs.</p>";
  }
}

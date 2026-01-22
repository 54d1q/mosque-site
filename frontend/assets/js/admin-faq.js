document.addEventListener("DOMContentLoaded", () => {
  // 1. Fetch existing FAQs on load
  fetchAdminFAQs();

  // 2. Handle adding a new FAQ
  const addForm = document.getElementById("add-faq-form");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const question = document.getElementById("faq-question").value;
      const answer = document.getElementById("faq-answer").value;
      const btn = e.target.querySelector("button");

      // Disable button
      btn.disabled = true;
      btn.innerText = "Posting...";

      try {
        const res = await fetch("/api/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, answer }),
        });

        if (res.ok) {
          showSuccessTick(); // <-- Animation instead of Alert
          e.target.reset();
          fetchAdminFAQs(); // Refresh list
        } else {
          alert("Error adding FAQ");
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      } finally {
        btn.disabled = false;
        btn.innerText = "Post to Website";
      }
    });
  }
});

// Function to fetch and render the list
async function fetchAdminFAQs() {
  const list = document.getElementById("admin-faq-list");
  if (!list) return;

  list.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch("/api/faqs");
    const data = await res.json();

    if (data.length === 0) {
      list.innerHTML =
        "<p style='color:#777; font-style:italic;'>No FAQs posted yet.</p>";
      return;
    }

    let html = '<div class="faq-list">';
    data.forEach((faq) => {
      html += `
            <div class="faq-list-item">
                <div class="faq-content">
                    <h4>Q: ${faq.question}</h4>
                    <p>A: ${faq.answer}</p>
                </div>
                <button class="btn-delete" onclick="deleteFAQ(${faq.id})">Delete</button>
            </div>`;
    });
    html += "</div>";
    list.innerHTML = html;
  } catch (err) {
    console.error(err);
    list.innerHTML = "<p style='color:red;'>Error loading FAQs</p>";
  }
}

// Function to delete an FAQ
async function deleteFAQ(id) {
  try {
    const res = await fetch(`/api/faqs/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchAdminFAQs(); // Refresh list
    } else {
      alert("Failed to delete.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}
function showSuccessTick() {
  const overlay = document.getElementById("success-overlay");
  overlay.classList.add("active");
  setTimeout(() => {
    overlay.classList.remove("active");
  }, 800);
}

document.addEventListener("DOMContentLoaded", () => {
  // Set default date to today
  document.getElementById("notice-date").valueAsDate = new Date();
  loadNotices();
});

async function loadNotices() {
  const list = document.getElementById("notice-list");
  // list.innerHTML = "<p>Loading...</p>"; // Optional: Removed to prevent flickering on reload

  try {
    const res = await fetch("/api/admin/notices");
    const data = await res.json();

    list.innerHTML = "";

    if (data.length === 0) {
      list.innerHTML =
        "<p style='padding:15px; color:#888; text-align:center;'>No notices found.</p>";
      return;
    }

    data.forEach((notice) => {
      const dateObj = new Date(notice.event_date);
      const dateStr = dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Check if expired
      const isExpired = new Date() > dateObj.setHours(23, 59, 59, 999);
      const statusBadge = isExpired
        ? '<span style="color:red; font-size:0.75rem; font-weight:bold; margin-left:5px;">(EXPIRED)</span>'
        : '<span style="color:green; font-size:0.75rem; font-weight:bold; margin-left:5px;">(ACTIVE)</span>';

      const li = document.createElement("li");
      li.className = "notice-item";
      li.innerHTML = `
                <div class="notice-content">
                    <h4 style="display:flex; align-items:center;">${
                      notice.title
                    } ${statusBadge}</h4>
                    <span class="notice-meta">📅 ${dateStr}</span>
                    <p class="notice-msg">${notice.message || ""}</p>
                </div>
                <button class="delete-btn" onclick="deleteNotice(${
                  notice.id
                })">🗑 Remove</button>
            `;
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    list.innerHTML = "<p style='color:red'>Error loading notices</p>";
  }
}

document
  .getElementById("add-notice-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("notice-title").value;
    const date = document.getElementById("notice-date").value;
    const message = document.getElementById("notice-message").value;

    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, event_date: date }),
      });

      if (res.ok) {
        showSuccessTick(); // <-- Animation instead of Alert
        document.getElementById("add-notice-form").reset();
        document.getElementById("notice-date").valueAsDate = new Date();
        loadNotices();
      } else {
        alert("Failed to add notice");
      }
    } catch (err) {
      console.error(err);
    }
  });

async function deleteNotice(id) {
  try {
    await fetch(`/api/notices/${id}`, { method: "DELETE" });
    loadNotices();
    // Optional: showSuccessTick() here if you want animation on delete too
  } catch (err) {
    console.error(err);
  }
}

// --- ANIMATION HELPER ---
function showSuccessTick() {
  const overlay = document.getElementById("success-overlay");
  overlay.classList.add("active");
  setTimeout(() => {
    overlay.classList.remove("active");
  }, 800);
}

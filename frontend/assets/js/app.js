function injectCookieBanner() {
  if (!localStorage.getItem("cookieConsent")) {
    // Create the Main Banner
    const banner = document.createElement("div");
    banner.id = "cookie-banner";
    banner.style =
      "position: fixed; bottom: 0; left: 0; width: 100%; background: #fff; padding: 20px; border-top: 3px solid #1e4d2b; z-index: 9999; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); text-align: center;";
    banner.innerHTML = `
            <p style="margin-bottom: 15px; color: #333; font-size: 0.95rem;">We use essential cookies to manage your login session. With your consent, we also use optional cookies to improve your experience.</p>
            <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; align-items: center;">
                <button onclick="acceptAllCookies()" class="btn-primary" style="padding: 8px 20px; cursor:pointer;">Accept All</button>
                <button onclick="openCookiePreferences()" class="btn-secondary" style="padding: 8px 20px; background:#eee; color:#333; cursor:pointer; border:1px solid #ddd;">Preferences</button>
                <button onclick="acceptNecessaryOnly()" class="btn-secondary" style="padding: 8px 20px; cursor:pointer;">Necessary Only</button>
                <a href="/privacy-policy" style="color: #1e4d2b; font-size: 0.9rem; text-decoration: underline; margin-left: 10px;">Privacy Policy</a>
            </div>
        `;

    // Create the Hidden Preferences Modal
    const modal = document.createElement("div");
    modal.id = "cookie-modal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: left; background: white; border-radius: 8px; overflow: hidden; margin: auto;">
                <div class="modal-header" style="background:#1e4d2b; color:white; padding:15px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0;">Cookie Preferences</h3>
                    <span style="cursor:pointer; font-size: 1.5rem;" onclick="closeCookiePreferences()">&times;</span>
                </div>
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <label style="font-weight:bold; display: flex; justify-content: space-between;">Essential (Required) <input type="checkbox" checked disabled></label>
                        <p style="font-size: 0.85rem; color: #666; margin: 5px 0 0 0;">Needed for logging in and secure payments. Cannot be turned off.</p>
                    </div>
                    <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <label style="font-weight:bold; display: flex; justify-content: space-between;">Analytics <input type="checkbox" id="pref-analytics"></label>
                        <p style="font-size: 0.85rem; color: #666; margin: 5px 0 0 0;">Helps us understand how visitors use the site so we can improve navigation.</p>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="font-weight:bold; display: flex; justify-content: space-between;">Functional <input type="checkbox" id="pref-functional"></label>
                        <p style="font-size: 0.85rem; color: #666; margin: 5px 0 0 0;">Remembers your settings like "Teacher Mode" preferences.</p>
                    </div>
                </div>
                <div class="modal-actions" style="padding:15px; background:#f9f9f9; display:flex; justify-content:flex-end; gap:10px; border-top: 1px solid #eee;">
                    <button onclick="savePreferences()" class="btn-primary" style="padding: 8px 20px; cursor:pointer;">Save & Finish</button>
                </div>
            </div>
        `;

    document.body.appendChild(banner);
    document.body.appendChild(modal);
  }
}
// Run this on every page load
document.addEventListener("DOMContentLoaded", injectCookieBanner);

// --- NAVIGATION LOGIC ---
function toggleMobileMenu() {
  const menu = document.querySelector(".nav-menu");
  if (menu) menu.classList.toggle("active");
}

function toggleSubmenu(element) {
  if (window.innerWidth <= 768) {
    element.classList.toggle("open");
  }
}

// --- PRAYER TIMES LOGIC ---
let allTimings = [];
let jumahTimings = [];
let currentIndex = 0;

// Track the month shown in the table view
let currentTableDate = new Date();

const fullMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("prayer-grid-display")) {
    initPrayerApp();
  }

  if (document.querySelector(".side-column")) {
    loadPublicNotices();
  }

  if (document.getElementById("story-title")) {
    loadDailyStory();
  }

  const prevBtn = document.getElementById("prev-day");
  const nextBtn = document.getElementById("next-day");
  if (prevBtn) prevBtn.addEventListener("click", () => changeDay(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => changeDay(1));

  const tablePrev = document.getElementById("table-prev");
  const tableNext = document.getElementById("table-next");
  if (tablePrev)
    tablePrev.addEventListener("click", () => changeTableMonth(-1));
  if (tableNext) tableNext.addEventListener("click", () => changeTableMonth(1));

  if (document.getElementById("prayer-grid-display")) {
    setInterval(() => {
      if (isViewingToday()) renderDay();
    }, 60000);
  }

  // --- ENQUIRY FORM ---
  const enquiryForm = document.getElementById("enquiry-form");
  if (enquiryForm) {
    enquiryForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("button");
      const originalText = btn.innerText;
      btn.disabled = true;
      btn.innerText = "Sending...";

      const formData = {
        name: e.target.name.value,
        email: e.target.email.value,
        message: e.target.message.value,
      };

      try {
        const res = await fetch("/api/submit-enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          alert("Message sent successfully!");
          closeEnquiryModal();
          e.target.reset();
        } else {
          alert("Failed to send message. Please try again.");
        }
      } catch (err) {
        console.error(err);
        alert("Server connection error.");
      } finally {
        btn.disabled = false;
        btn.innerText = originalText;
      }
    });
  }
});

// --- HELPER FUNCTIONS ---
async function initPrayerApp() {
  const gridDisplay = document.getElementById("prayer-grid-display");
  if (!gridDisplay) return;

  try {
    const response = await fetch("/api/prayers");
    if (!response.ok) throw new Error("Backend connection failed");
    const data = await response.json();
    if (!data.model || !data.model.salahTimings)
      throw new Error("Invalid Data");

    allTimings = data.model.salahTimings;

    // Sort Jumu'ah times properly
    jumahTimings = data.model.jumahSalahIqamahTimings || [];
    jumahTimings.sort((a, b) => a.time.localeCompare(b.time));

    const today = new Date();
    currentIndex = allTimings.findIndex(
      (t) => t.day === today.getDate() && t.month === today.getMonth() + 1,
    );
    if (currentIndex === -1) currentIndex = 0;

    renderDay();
    generatePublicTable();
  } catch (error) {
    console.error("Error:", error);
    if (gridDisplay)
      gridDisplay.innerHTML = `<p style="color:red; text-align:center;">Prayer times unavailable</p>`;
  }
}

function renderDay() {
  if (!allTimings[currentIndex]) return;
  const dayData = allTimings[currentIndex];
  const gridDisplay = document.getElementById("prayer-grid-display");
  if (!gridDisplay) return;

  const englishDateSpan = document.getElementById("english-date");
  const arabicDateSpan = document.getElementById("arabic-date");
  const currentYear = new Date().getFullYear();
  const dateObj = new Date(currentYear, dayData.month - 1, dayData.day);

  if (englishDateSpan)
    englishDateSpan.innerText = dateObj.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  if (arabicDateSpan) {
    const hijriDate = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dateObj);
    arabicDateSpan.innerText = hijriDate.replace(" AH", "");
  }

  const prayers = [
    {
      label: "Fajr",
      start: dayData.fajr[0].salahTime,
      jamaat: dayData.fajr[0].iqamahTime,
    },
    { label: "Sunrise", start: dayData.shouruq[0].salahTime, jamaat: null },
    {
      label: "Dhuhr",
      start: dayData.zuhr[0].salahTime,
      jamaat: dayData.zuhr[0].iqamahTime,
    },
    {
      label: "Asr",
      start: dayData.asr[0].salahTime,
      jamaat: dayData.asr[0].iqamahTime,
    },
    {
      label: "Maghrib",
      start: dayData.maghrib[0].salahTime,
      jamaat: dayData.maghrib[0].iqamahTime,
    },
    {
      label: "Isha",
      start: dayData.isha[0].salahTime,
      jamaat: dayData.isha[0].iqamahTime,
    },
  ];

  let activeIndex = -1;
  if (isViewingToday()) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < prayers.length; i++) {
      const [h, m] = prayers[i].start.split(":").map(Number);
      if (h * 60 + m > currentMinutes) {
        activeIndex = i;
        break;
      }
    }
    if (activeIndex === -1) activeIndex = 0;
  }

  gridDisplay.innerHTML = "";

  prayers.forEach((p, index) => {
    const isActive = index === activeIndex;
    const box = document.createElement("div");
    box.className = `prayer-box ${isActive ? "active-prayer" : ""}`;

    let timesHtml = "";
    if (p.label === "Sunrise") {
      timesHtml = `<div class="prayer-time single-time">${p.start}</div>`;
    } else {
      timesHtml = `
            <div class="prayer-row">
                <span class="label-small">Begins</span>
                <span class="time-small">${p.start}</span>
            </div>
            <div class="prayer-row jamaat-row">
                <span class="label-small">Iqamah</span>
                <span class="jamaat-time">${p.jamaat}</span>
            </div>`;
    }

    const nextLabel = isActive
      ? `<small style="display:block; font-size:0.7em; color:#ffd700; font-weight:bold; margin-bottom:2px;">NEXT</small>`
      : "";

    box.innerHTML = `
        ${nextLabel}
        <span class="prayer-name">${p.label}</span>
        ${timesHtml}
    `;
    gridDisplay.appendChild(box);
  });

  if (jumahTimings.length > 0) {
    const jumahBox = document.createElement("div");
    jumahBox.className = "prayer-box jumah-box";

    let jumahContent = `<span class="prayer-name">Jumu'ah</span>`;

    jumahTimings.forEach((j, i) => {
      let labelText = "";
      if (jumahTimings.length === 1) {
        labelText = "Jamaat";
      } else {
        labelText = `${i + 1}${getOrdinal(i + 1)} Jamaat`;
      }

      jumahContent += `
            <div class="prayer-row jumah-row">
                <span class="label-small">${labelText}</span>
                <span class="jamaat-time">${j.iqamahTime}</span>
            </div>`;
    });

    jumahBox.innerHTML = jumahContent;
    gridDisplay.appendChild(jumahBox);
  }
}

function getOrdinal(n) {
  var s = ["th", "st", "nd", "rd"];
  var v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function togglePublicView() {
  const grid = document.getElementById("prayer-grid-display");
  const table = document.getElementById("prayer-table-display");
  const header = document.getElementById("main-header");
  if (table.style.display === "none") {
    table.style.display = "block";
    grid.style.display = "none";
    header.style.display = "none";
  } else {
    table.style.display = "none";
    grid.style.display = "grid";
    header.style.display = "block";
  }
}

function changeTableMonth(offset) {
  currentTableDate.setMonth(currentTableDate.getMonth() + offset);
  generatePublicTable();
}

function generatePublicTable() {
  const tbody = document.getElementById("public-table-body");
  const monthLabel = document.getElementById("table-month-label");
  if (!tbody) return;
  tbody.innerHTML = "";

  const today = new Date();
  const targetMonth = currentTableDate.getMonth() + 1;
  const targetYear = currentTableDate.getFullYear();

  if (monthLabel)
    monthLabel.innerText = `${
      fullMonthNames[currentTableDate.getMonth()]
    } ${targetYear}`;

  const monthData = allTimings.filter((t) => t.month === targetMonth);

  if (monthData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12">No data available for this month</td></tr>`;
    return;
  }

  monthData.forEach((day) => {
    const row = document.createElement("tr");

    if (day.day === today.getDate() && targetMonth === today.getMonth() + 1) {
      row.classList.add("today-row-public");
    }

    // HIJRI CALCULATION ADDED HERE
    const dateObj = new Date(targetYear, targetMonth - 1, day.day);
    const hijriDate = new Intl.DateTimeFormat("en-TN-u-ca-islamic", {
      day: "numeric",
      month: "short",
    }).format(dateObj);
    const cleanHijri = hijriDate.replace(" AH", "");

    row.innerHTML = `<td style="font-weight:bold;">${day.day}</td>
      <td>${day.fajr[0].salahTime}</td><td style="font-weight:bold">${day.fajr[0].iqamahTime}</td>
      <td>${day.shouruq[0].salahTime}</td>
      <td>${day.zuhr[0].salahTime}</td><td style="font-weight:bold">${day.zuhr[0].iqamahTime}</td>
      <td>${day.asr[0].salahTime}</td><td style="font-weight:bold">${day.asr[0].iqamahTime}</td>
      <td>${day.maghrib[0].salahTime}</td><td style="font-weight:bold">${day.maghrib[0].iqamahTime}</td>
      <td>${day.isha[0].salahTime}</td><td style="font-weight:bold">${day.isha[0].iqamahTime}</td>
      <td style="font-size:0.85rem; color:#555;">${cleanHijri}</td>`;

    tbody.appendChild(row);
  });
}

// UPDATED PDF FUNCTION
function downloadPDF() {
  const element = document.getElementById("printable-timetable");
  element.classList.add("pdf-mode");
  window.scrollTo(0, 0);

  const monthLabel = document.getElementById("table-month-label").innerText;

  html2pdf()
    .set({
      margin: 0.2, // Small uniform margin
      filename: `Prayer_Timetable_${monthLabel}.pdf`,
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" }, // Standard A4
      pagebreak: { mode: "avoid-all" },
    })
    .from(element)
    .save()
    .then(() => element.classList.remove("pdf-mode"));
}

function changeDay(offset) {
  const newIndex = currentIndex + offset;
  if (newIndex >= 0 && newIndex < allTimings.length) {
    currentIndex = newIndex;
    renderDay();
  }
}

function isViewingToday() {
  if (!allTimings[currentIndex]) return false;
  const today = new Date();
  return (
    allTimings[currentIndex].day === today.getDate() &&
    allTimings[currentIndex].month === today.getMonth() + 1
  );
}

async function loadPublicNotices() {
  const sideColumn = document.querySelector(".side-column");
  if (!sideColumn) return;
  try {
    const res = await fetch("/api/public/notices");
    const notices = await res.json();
    let html = '<div class="section-header"><span>Notice Board</span></div>';
    if (notices.length === 0) {
      html +=
        '<div class="update-item"><div class="update-title" style="color:#777;">No new announcements at this time.</div></div>';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      notices.forEach((n) => {
        const nDate = new Date(n.event_date);
        nDate.setHours(0, 0, 0, 0);
        const dateBadge =
          nDate.getTime() === today.getTime()
            ? "Today"
            : nDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              });
        html += `<div class="update-item"><span class="date-badge">${dateBadge}</span><div class="update-title" style="font-weight:bold; margin-bottom:4px;">${
          n.title
        }</div><div style="font-size:0.85rem; color:#555;">${
          n.message || ""
        }</div></div>`;
      });
    }
    sideColumn.innerHTML = html;
  } catch (err) {
    console.error("Error loading notices:", err);
  }
}

async function loadDailyStory() {
  const storyTitle = document.getElementById("story-title");
  if (!storyTitle) return;

  try {
    const response = await fetch("/assets/js/stories.json");
    if (!response.ok) throw new Error("Could not load stories");
    const stories = await response.json();
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    currentStory = stories[(dayOfYear - 1) % stories.length];
    storyTitle.innerText = currentStory.title;
    document.getElementById("story-summary").innerText = currentStory.summary;
    document.getElementById("story-img").style.backgroundImage =
      `url('${currentStory.image}')`;
  } catch (error) {
    if (storyTitle) storyTitle.innerText = "Welcome";
    const summary = document.getElementById("story-summary");
    if (summary)
      summary.innerText = "Visit us to learn more about our community.";
  }
}
function formatMarkdown(text) {
  if (!text) return "";

  // 1. Convert double newlines (\n\n) into two line breaks
  let formatted = text.replace(/\n\n/g, "<br><br>");

  // 2. Convert remaining single newlines (\n) into one line break
  formatted = formatted.replace(/\n/g, "<br>");

  // 3. Keep the bolding logic (**text** -> <b>text</b>)
  return formatted.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
}

function openStoryModal() {
  if (!currentStory || !currentStory.title) return;
  document.getElementById("modal-story-title").innerText = currentStory.title;
  document.getElementById("modal-story-img").src = currentStory.image;

  const formattedContent = formatMarkdown(currentStory.content);
  // Use innerHTML instead of innerText so the <b> tags work
  document.getElementById("modal-story-content").innerHTML = formattedContent;

  // ADD THE LESSON LEARNED
  const lessonElement = document.getElementById("modal-story-lesson");
  if (lessonElement && currentStory.lesson) {
    lessonElement.innerHTML = `<strong>Lesson Learned:</strong> ${formatMarkdown(currentStory.lesson)}`;
    lessonElement.style.display = "block";
  } else if (lessonElement) {
    lessonElement.style.display = "none";
  }

  document.getElementById("story-modal").style.display = "flex";
}
function closeStoryModal() {
  document.getElementById("story-modal").style.display = "none";
}
function openEnquiryModal() {
  document.getElementById("enquiry-modal").style.display = "flex";
}
function closeEnquiryModal() {
  document.getElementById("enquiry-modal").style.display = "none";
}

window.onclick = function (event) {
  if (event.target === document.getElementById("story-modal"))
    closeStoryModal();
  if (event.target === document.getElementById("enquiry-modal"))
    closeEnquiryModal();
};

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

//FAQ
document.addEventListener("DOMContentLoaded", () => {
  loadPublicFAQs();

  const form = document.getElementById("ask-imam-form");
  if (form) {
    form.addEventListener("submit", handleQuestionSubmit);
  }
});

// Load FAQs from API
async function loadPublicFAQs() {
  const container = document.querySelector(".faq-container");
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
    faqs.forEach((faq) => {
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
// --- LOGOUT LOGIC ---
async function handleLogout() {
  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      // Clear any local storage set during login
      localStorage.removeItem("user");
      window.location.href = "/login";
    } else {
      alert("Logout failed. Please try again.");
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }
}

document.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("logout-link") ||
    e.target.closest(".logout-link")
  ) {
    e.preventDefault();
    handleLogout();
  }
});
// --- COOKIE BUTTON FUNCTIONS ---

function acceptAllCookies() {
  const consentObj = {
    essential: true,
    analytics: true,
    functional: true,
    date: new Date().toISOString(),
  };
  localStorage.setItem("cookieConsent", JSON.stringify(consentObj));
  hideBanner();
}

function acceptNecessaryOnly() {
  const consentObj = {
    essential: true,
    analytics: false,
    functional: false,
    date: new Date().toISOString(),
  };
  localStorage.setItem("cookieConsent", JSON.stringify(consentObj));
  hideBanner();
}

function openCookiePreferences() {
  const modal = document.getElementById("cookie-modal");
  if (modal) modal.style.display = "flex";
}

function closeCookiePreferences() {
  const modal = document.getElementById("cookie-modal");
  if (modal) modal.style.display = "none";
}

function savePreferences() {
  const analytics = document.getElementById("pref-analytics").checked;
  const functional = document.getElementById("pref-functional").checked;

  const consentObj = {
    essential: true,
    analytics: analytics,
    functional: functional,
    date: new Date().toISOString(),
  };

  localStorage.setItem("cookieConsent", JSON.stringify(consentObj));
  hideBanner();
}

function hideBanner() {
  const banner = document.getElementById("cookie-banner");
  if (banner) banner.remove();
  closeCookiePreferences();
}

document.addEventListener("DOMContentLoaded", injectCookieBanner);

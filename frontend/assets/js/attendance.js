// Global State
let currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
let currentHistMonth = new Date().getMonth() + 1; // 1-12
let currentHistYear = new Date().getFullYear();
let selectedStudentId = null;
let allStudentsForSearch = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // 1. Set the Date FIRST
  document.getElementById("att-date").value = currentDate;

  // 2. Load Dropdowns (Levels & Teachers)
  loadLevelsForAttendance();
  loadTeachersForFilter(); // <--- ADDED THIS

  // 3. Check Role & Load Data
  checkUserRole();

  // 4. Load Search Data
  loadAllStudentsForSearch();
});

function showSuccessTick() {
  const overlay = document.getElementById("success-overlay");
  overlay.classList.add("active");
  setTimeout(() => {
    overlay.classList.remove("active");
  }, 800);
}

// --- LOAD DROPDOWNS ---
async function loadLevelsForAttendance() {
  const levelSelect = document.getElementById("att-level");
  if (!levelSelect) return;

  try {
    const res = await fetch("/api/levels");
    const levels = await res.json();
    levelSelect.innerHTML = '<option value="">All Levels</option>';
    levels.forEach((lvl) => {
      levelSelect.innerHTML += `<option value="${lvl.name}">${lvl.name}</option>`;
    });
  } catch (err) {
    console.error("Error loading levels:", err);
  }
}

// --- NEW: LOAD TEACHERS DROPDOWN ---
async function loadTeachersForFilter() {
  const teacherSelect = document.getElementById("att-teacher");
  if (!teacherSelect) return; // Skip if element missing (e.g. teacher login)

  try {
    const res = await fetch("/api/teachers");
    const teachers = await res.json();
    teacherSelect.innerHTML = '<option value="">All Teachers</option>';
    teachers.forEach((t) => {
      teacherSelect.innerHTML += `<option value="${t.id}">${t.username}</option>`;
    });
  } catch (err) {
    console.error("Error loading teachers:", err);
  }
}

function onDateChange() {
  const role = localStorage.getItem("userRole");
  if (role === "teacher") {
    loadTeacherRegister(); // Auto-load for teachers
  } else {
    loadDailyRegister(); // Auto-load for Admin/Headteacher
  }
}

function checkUserRole() {
  const user = JSON.parse(localStorage.getItem("user"));

  // Redirect if no user is found
  if (!user) {
    window.location.href = "/login";
    return;
  }

  // Set the welcome name
  const nameSpan = document.getElementById("teacher-name-span");
  if (nameSpan) nameSpan.innerText = user.name;

  const body = document.getElementById("page-body");
  const adminControls = document.getElementById("admin-controls");

  if (user.role === "teacher") {
    // TEACHER MODE UI
    body?.classList.add("teacher-mode");
    // Using setProperty to ensure 'none' overrides other styles
    adminControls?.style.setProperty("display", "none", "important");
    loadTeacherRegister();
  } else {
    // ADMIN MODE UI
    body?.classList.remove("teacher-mode");
    if (adminControls) adminControls.style.display = "flex";
    loadDailyRegister();
  }
}

// --- PASSWORD MODAL LOGIC ---
function openPasswordModal() {
  document.getElementById("password-modal").style.display = "flex";
}

function closePasswordModal() {
  document.getElementById("password-modal").style.display = "none";
}

// --- NEW: REQUEST RESET LINK ---
async function requestResetLink() {
  const userId = localStorage.getItem("userId");
  const btn = document.querySelector("#password-modal button");
  const msg = document.getElementById("reset-msg");

  if (!userId) {
    alert("Error: You seem to be logged out.");
    return;
  }

  // UI Feedback
  btn.disabled = true;
  btn.innerText = "Sending...";
  msg.style.color = "#333";
  msg.innerText = "";

  try {
    const res = await fetch("/api/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();

    if (data.success) {
      msg.style.color = "green";
      msg.innerText = "✅ " + data.message;
      btn.innerText = "Link Sent";
    } else {
      msg.style.color = "red";
      msg.innerText = "❌ " + data.message;
      btn.disabled = false;
      btn.innerText = "Send Reset Link";
    }
  } catch (err) {
    console.error(err);
    msg.style.color = "red";
    msg.innerText = "❌ Connection Error";
    btn.disabled = false;
    btn.innerText = "Send Reset Link";
  }
}

// --- TAB SWITCHING ---
function switchTab(tab) {
  document.getElementById("tab-daily").style.display =
    tab === "daily" ? "block" : "none";
  document.getElementById("tab-history").style.display =
    tab === "history" ? "block" : "none";
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  event.target.classList.add("active");
}

// --- TAB 1: ADMIN/HEADTEACHER REGISTER VIEW ---
async function loadDailyRegister() {
  const date = document.getElementById("att-date").value;
  const gender = document.getElementById("att-gender").value;
  const level = document.getElementById("att-level").value;
  const teacherId = document.getElementById("att-teacher")
    ? document.getElementById("att-teacher").value
    : "";

  try {
    // Fetch with all filters (Date, Gender, Level, Teacher)
    const res = await fetch(
      `/api/attendance/class?date=${date}&gender=${gender}&level=${level}&teacherId=${teacherId}`,
    );
    const students = await res.json();

    const tbody = document.getElementById("attendance-body");
    const card = document.getElementById("register-card");
    const statBox = document.getElementById("att-stats");

    tbody.innerHTML = "";
    card.style.display = "block"; // Show the card

    if (students.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="2" style="text-align:center; padding:20px;">No students found for this filter.</td></tr>';
      if (statBox) statBox.innerText = "0 / 0 Present";
      return;
    }

    let presentCount = 0;

    students.forEach((s) => {
      const isPresent = s.status === "Present";
      if (isPresent) presentCount++;

      tbody.innerHTML += `
        <tr>
            <td>
                <strong>${s.first_name} ${s.last_name}</strong>
                <div style="font-size:0.8em; color:#777;">${
                  s.level || "No Level"
                }</div>
            </td>
            <td style="text-align: center;">
                <input type="checkbox" class="att-checkbox" data-id="${s.id}" ${
                  isPresent ? "checked" : ""
                }>
            </td>
        </tr>`;
    });

    // --- UPDATE STATS ---
    if (statBox) {
      statBox.innerText = `📊 ${presentCount} / ${students.length} Present`;
    }

    // Add listener for live stat updates
    document.querySelectorAll(".att-checkbox").forEach((box) => {
      box.addEventListener("change", updateLiveStats);
    });
  } catch (err) {
    console.error(err);
  }
}

// Helper: Update stats when checkboxes are clicked
function updateLiveStats() {
  const allBoxes = document.querySelectorAll(".att-checkbox");
  const checked = document.querySelectorAll(".att-checkbox:checked");
  const statBox = document.getElementById("att-stats");
  if (statBox) {
    statBox.innerText = `📊 ${checked.length} / ${allBoxes.length} Present`;
  }
}

// --- TAB 1: TEACHER REGISTER (Restricted View) ---
async function loadTeacherRegister() {
  const userId = localStorage.getItem("userId");
  const date = document.getElementById("att-date").value;
  const tbody = document.getElementById("attendance-body");

  document.getElementById("register-card").style.display = "block";
  tbody.innerHTML =
    '<tr><td colspan="2" style="text-align:center;">Loading your students...</td></tr>';

  try {
    const res = await fetch(
      `/api/attendance/teacher-students/${userId}?date=${date}`,
    );
    const students = await res.json();

    tbody.innerHTML = "";
    let presentCount = 0;

    if (students.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="2" style="text-align:center; padding:20px;">No students found assigned to your classes.<br><small>Ask Admin to check your "Assigned Classes".</small></td></tr>';
      return;
    }

    students.forEach((s) => {
      const isPresent = s.status === "Present";
      if (isPresent) presentCount++;

      tbody.innerHTML += `
        <tr>
            <td>
                <strong>${s.first_name} ${s.last_name}</strong>
                <div style="font-size:0.8em; color:#777;">${
                  s.level || "No Level"
                }</div>
            </td>
            <td style="text-align: center;">
                <input type="checkbox" class="att-checkbox" data-id="${s.id}" ${
                  isPresent ? "checked" : ""
                }>
            </td>
        </tr>`;
    });

    // Update Stats for Teacher
    const statBox = document.getElementById("att-stats");
    if (statBox)
      statBox.innerText = `📊 ${presentCount} / ${students.length} Present`;

    document.querySelectorAll(".att-checkbox").forEach((box) => {
      box.addEventListener("change", updateLiveStats);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="2" style="color:red; text-align:center;">Error loading students.</td></tr>';
  }
}

// --- SUBMIT ATTENDANCE ---
document
  .getElementById("attendance-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("att-date").value;

    const records = Array.from(document.querySelectorAll(".att-checkbox")).map(
      (box) => ({
        student_id: box.getAttribute("data-id"),
        status: box.checked ? "Present" : "Absent",
      }),
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });

      if (res.ok) {
        showSuccessTick();
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch (err) {
      console.error(err);
    }
  });

// --- TAB 2: HISTORY & SEARCH ---

async function loadAllStudentsForSearch() {
  const role = localStorage.getItem("userRole");
  const userId = localStorage.getItem("userId");
  let url = "/api/students";

  if (role === "teacher" && userId) {
    url = `/api/teachers/${userId}/students`;
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      allStudentsForSearch = await res.json();
    } else {
      allStudentsForSearch = [];
    }
  } catch (err) {
    console.error("Network error loading search list:", err);
    allStudentsForSearch = [];
  }
}

document
  .getElementById("hist-search")
  .addEventListener("input", filterStudentSearch);

function filterStudentSearch() {
  const input = document.getElementById("hist-search");
  const term = input.value.toLowerCase();
  const resultsDiv = document.getElementById("search-results");

  resultsDiv.innerHTML = "";

  if (term.length === 0) {
    resultsDiv.style.display = "none";
    return;
  }

  const matches = allStudentsForSearch.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(term),
  );

  if (matches.length === 0) {
    resultsDiv.style.display = "none";
    return;
  }

  matches.forEach((s) => {
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.innerText = `${s.first_name} ${s.last_name} (${s.level})`;

    div.onclick = () => {
      selectedStudentId = s.id;
      document.getElementById("hist-search").value =
        `${s.first_name} ${s.last_name}`;
      resultsDiv.style.display = "none";
      loadStudentHistory();
    };
    resultsDiv.appendChild(div);
  });

  resultsDiv.style.display = "block";
}

function changeMonth(delta) {
  currentHistMonth += delta;
  if (currentHistMonth > 12) {
    currentHistMonth = 1;
    currentHistYear++;
  }
  if (currentHistMonth < 1) {
    currentHistMonth = 12;
    currentHistYear--;
  }
  loadStudentHistory();
}

async function loadStudentHistory() {
  if (!selectedStudentId) return;

  const monthNames = [
    "",
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
  document.getElementById("hist-month-label").innerText =
    `${monthNames[currentHistMonth]} ${currentHistYear}`;

  try {
    const res = await fetch(
      `/api/attendance/student/${selectedStudentId}?month=${currentHistMonth}&year=${currentHistYear}`,
    );
    const history = await res.json();

    const tbody = document.getElementById("history-body");
    tbody.innerHTML = "";
    document.getElementById("history-card").style.display = "block";

    let presentCount = 0;
    let totalDays = history.length;

    history.forEach((h) => {
      if (h.status === "Present") presentCount++;

      const dateObj = new Date(h.date);
      const dateStr = dateObj.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      tbody.innerHTML += `
        <tr>
            <td>${dateStr}</td>
            <td class="${
              h.status === "Present" ? "status-present" : "status-absent"
            }">
                ${h.status === "Present" ? "✔ Present" : "✘ Absent"}
            </td>
        </tr>`;
    });

    const percentage =
      totalDays === 0 ? 0 : Math.round((presentCount / totalDays) * 100);
    const badge = document.getElementById("percentage-badge");

    badge.innerText = totalDays === 0 ? "No Data" : `${percentage}% Attendance`;
    badge.className = "badge";
    badge.style.background = "";

    if (totalDays === 0) {
      badge.style.background = "#ccc";
    } else if (percentage >= 90) badge.classList.add("p-green");
    else if (percentage >= 80) badge.classList.add("p-yellow");
    else if (percentage >= 70) badge.classList.add("p-amber");
    else if (percentage >= 60) badge.classList.add("p-orange");
    else badge.classList.add("p-red");
  } catch (err) {
    console.error(err);
  }
}

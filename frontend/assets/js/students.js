// --- GLOBAL VARIABLES ---
let allStudentsData = [];
let availableLevels = [];
let studentToDeleteId = null;
let currentView = "active"; // Tracks which tab is open
let studentToApproveId = null;
let levelToApprove = null;
let currentResultStudentLevel = ""; // NEW: For checking Hifz

// --- INITIALIZE ---
document.addEventListener("DOMContentLoaded", () => {
  loadLevelsForDropdowns();
  loadStudents(); // Default load

  // Search Filters
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.addEventListener("keyup", applyFilters);

  const filterGender = document.getElementById("filter-gender");
  if (filterGender) filterGender.addEventListener("change", applyFilters);

  const filterLevel = document.getElementById("filter-level");
  if (filterLevel) filterLevel.addEventListener("change", applyFilters);

  // Auto-Calculate Age in Edit Modal
  const editDob = document.getElementById("edit-dob");
  if (editDob) {
    editDob.addEventListener("change", (e) => {
      document.getElementById("edit-age").value = calculateAge(e.target.value);
    });
  }
});

// --- TOGGLE LIST (Mobile/Desktop Toggle) ---
const toggleBtn = document.getElementById("toggle-list-btn");
const listCard = document.getElementById("student-list-card");
if (toggleBtn && listCard) {
  toggleBtn.addEventListener("click", () => {
    const isHidden = listCard.style.display === "none";
    listCard.style.display = isHidden ? "block" : "none";
    toggleBtn.innerText = isHidden
      ? "👁️ Hide Student List"
      : "👁️ Show Student List";
  });
}

// --- LOAD LEVELS ---
async function loadLevelsForDropdowns() {
  try {
    const res = await fetch("/api/levels");
    availableLevels = await res.json();
    const ids = ["reg-level", "filter-level", "edit-level"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = id.includes("filter")
          ? '<option value="">All Levels</option>'
          : '<option value="">Select Level</option>';
        availableLevels.forEach(
          (lvl) =>
            (el.innerHTML += `<option value="${lvl.name}">${lvl.name}</option>`)
        );
      }
    });
  } catch (err) {
    console.error("Error loading levels", err);
  }
}

// --- ADD STUDENT (Manual Admin Add) ---
const studentForm = document.getElementById("add-student-form");
if (studentForm) {
  studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      first_name: document.getElementById("reg-first-name").value,
      last_name: document.getElementById("reg-last-name").value,
      gender: document.getElementById("reg-gender").value,
      level: document.getElementById("reg-level").value,
      dob: document.getElementById("reg-dob").value,
      parent_name: document.getElementById("reg-parent").value,
      address_line1: document.getElementById("reg-address").value,
      city: document.getElementById("reg-city").value,
      postcode: document.getElementById("reg-postcode").value,
      home_tel: document.getElementById("reg-home-tel").value,
      mobile: document.getElementById("reg-mobile").value,
      emergency_contact: document.getElementById("reg-emergency").value,
      email: document.getElementById("reg-email").value,
      medical_info: document.getElementById("reg-medical").value,
      doctor_info: document.getElementById("reg-doctor").value,
    };

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        studentForm.reset();
        showSuccess("Student added successfully!");

        // Refresh the Active list specifically
        if (currentView !== "active") switchView("active");
        else await loadStudents();

        if (listCard) listCard.style.display = "block";
      } else {
        alert("Error adding student. Please check inputs.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error.");
    }
  });
}

// --- LOAD ACTIVE STUDENTS ---
async function loadStudents() {
  try {
    const response = await fetch("/api/students?status=approved");
    allStudentsData = await response.json();

    allStudentsData.sort((a, b) => {
      const gradeA = parseFloat(a.final_grade) || 0;
      const gradeB = parseFloat(b.final_grade) || 0;
      if (gradeB !== gradeA) return gradeB - gradeA;
      return a.first_name.localeCompare(b.first_name);
    });

    applyFilters();
  } catch (error) {
    console.error("Error loading students", error);
  }
}

// --- RENDER TABLE (Active) ---
function renderTable(data) {
  const tbody = document.getElementById("students-body");
  if (!tbody) return;
  tbody.innerHTML = "";
  const counter = document.getElementById("student-counter");
  if (counter) counter.innerText = `Total: ${data.length}`;

  let currentCategory = "";
  let rowNumber = 1;

  data.forEach((s) => {
    const grade = parseFloat(s.final_grade) || 0;
    const cat = getGradeCategory(grade);

    if (cat.name !== currentCategory) {
      currentCategory = cat.name;
      const separator = document.createElement("tr");
      separator.className = "category-row";
      separator.innerHTML = `<td colspan="8" style="border-left: 5px solid ${
        cat.color
      }; background:#f9f9f9; padding:10px; font-weight:bold;">${cat.name} (${
        grade < 1 ? "Ungraded" : cat.range
      })</td>`;
      tbody.appendChild(separator);
    }

    const address = [s.address_line1, s.city, s.postcode]
      .filter(Boolean)
      .join(", ");

    // Clickable Contacts
    let contactHtml = `<div style="font-size:0.8rem; line-height:1.6;">`;
    if (s.home_phone)
      contactHtml += `<div><b>HT:</b> <a href="tel:${s.home_phone}" style="color:#333; text-decoration:none;">${s.home_phone}</a></div>`;
    if (s.phone)
      contactHtml += `<div><b>M:</b> <a href="tel:${s.phone}" style="color:#333; text-decoration:none;">${s.phone}</a></div>`;
    if (s.emergency_phone)
      contactHtml += `<div><b>EC:</b> <a href="tel:${s.emergency_phone}" style="color:#c0392b; text-decoration:none;">${s.emergency_phone}</a></div>`;
    if (s.email)
      contactHtml += `<div><b>E:</b> <a href="mailto:${s.email}" style="color:#1e4d2b; text-decoration:underline;">${s.email}</a></div>`;
    contactHtml += `</div>`;

    if (
      contactHtml === `<div style="font-size:0.8rem; line-height:1.6;"></div>`
    ) {
      contactHtml = `<span style="color:#ccc">No Contact</span>`;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
        <td style="color:#555;">${rowNumber++}</td>
        <td style="font-weight:bold">${s.first_name} ${s.last_name}</td>
        <td>${s.gender}</td>
        <td><span class="level-badge">${s.level}</span></td>
        <td>${s.parent_name || "-"}</td>
        <td style="font-size:0.8rem; max-width:150px;">${address}</td>
        <td>${contactHtml}</td>
        <td>
            <button class="btn-results" onclick="openResultsModal(${s.id}, '${
      s.first_name
    } ${s.last_name}')">📊 Results</button>
            <button class="btn-edit" onclick="openEditModal(${
              s.id
            })">✏️ Edit</button>
            <button class="btn-delete" onclick="openDeleteModal(${s.id}, '${
      s.first_name
    } ${s.last_name}')">🗑</button>
        </td>
    `;
    tbody.appendChild(row);
  });
}

// --- HELPER: Calculate Age ---
function calculateAge(dob) {
  if (!dob) return "";
  const birthDate = new Date(dob);
  const diff = Date.now() - birthDate.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// --- EDIT MODAL FUNCTIONS ---
function openEditModal(id) {
  const student = allStudentsData.find((s) => s.id === id);
  if (!student) return;

  document.getElementById("edit-modal").style.display = "flex";
  document.getElementById("edit-student-id").value = student.id;
  document.getElementById(
    "edit-student-name"
  ).innerText = `${student.first_name} ${student.last_name}`;

  document.getElementById("edit-level").value = student.level;
  document.getElementById("edit-home-tel").value = student.home_phone || "";
  document.getElementById("edit-mobile").value = student.phone || "";
  document.getElementById("edit-emergency").value =
    student.emergency_phone || "";
  document.getElementById("edit-email").value = student.email || "";
  document.getElementById("edit-addr1").value = student.address_line1 || "";
  document.getElementById("edit-city").value = student.city || "";
  document.getElementById("edit-postcode").value = student.postcode || "";
  document.getElementById("edit-medical").value = student.medical_info || "";
  document.getElementById("edit-doctor").value = student.doctor_info || "";

  if (student.dob) {
    const formattedDate = new Date(student.dob).toISOString().split("T")[0];
    document.getElementById("edit-dob").value = formattedDate;
    document.getElementById("edit-age").value = calculateAge(formattedDate);
  } else {
    document.getElementById("edit-dob").value = "";
    document.getElementById("edit-age").value = "";
  }
}

function closeEditModal() {
  document.getElementById("edit-modal").style.display = "none";
}

const editForm = document.getElementById("edit-student-form");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-student-id").value;
    const body = {
      level: document.getElementById("edit-level").value,
      dob: document.getElementById("edit-dob").value,
      home_tel: document.getElementById("edit-home-tel").value,
      mobile: document.getElementById("edit-mobile").value,
      emergency_contact: document.getElementById("edit-emergency").value,
      email: document.getElementById("edit-email").value,
      address_line1: document.getElementById("edit-addr1").value,
      city: document.getElementById("edit-city").value,
      postcode: document.getElementById("edit-postcode").value,
      medical_info: document.getElementById("edit-medical").value,
      doctor_info: document.getElementById("edit-doctor").value,
    };

    await fetch(`/api/students/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeEditModal();
    showSuccess("Details updated!");
    loadStudents();
  });
}

// --- DELETE MODAL FUNCTIONS ---
function openDeleteModal(id, name) {
  studentToDeleteId = id;
  const nameSpan = document.getElementById("delete-student-name");
  if (nameSpan) nameSpan.innerText = name;
  document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("delete-modal").style.display = "none";
  studentToDeleteId = null;
}

const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    if (studentToDeleteId) {
      await fetch(`/api/students/${studentToDeleteId}`, { method: "DELETE" });
      closeDeleteModal();

      // Refresh the CORRECT list
      if (currentView === "pending") {
        await loadPendingStudents();
      } else {
        await loadStudents();
      }
    }
  });
}

// --- SUCCESS MODAL ---
function showSuccess(message) {
  const modal = document.getElementById("success-modal");
  const msgEl = document.getElementById("success-msg");
  if (modal && msgEl) {
    msgEl.innerText = message;
    modal.style.display = "flex";
  } else {
    alert(message);
  }
}

function closeSuccessModal() {
  document.getElementById("success-modal").style.display = "none";
}

// --- FILTERS ---
function applyFilters() {
  const term = document.getElementById("search-input").value.toLowerCase();
  const gender = document.getElementById("filter-gender").value;
  const level = document.getElementById("filter-level").value;

  const filtered = allStudentsData.filter((s) => {
    const nameMatch = (s.first_name + " " + s.last_name)
      .toLowerCase()
      .includes(term);
    const genderMatch = gender === "" || s.gender === gender;
    const levelMatch = level === "" || s.level === level;
    return nameMatch && genderMatch && levelMatch;
  });
  renderTable(filtered);
}

// --- HELPER: CATEGORIES ---
function getGradeCategory(grade) {
  if (grade === 0) return { name: "No Grades", color: "#ccc", range: "" };
  if (grade >= 90)
    return { name: "Excellent", color: "#27ae60", range: "90%+" };
  if (grade >= 80)
    return { name: "Outstanding", color: "#1abc9c", range: "80-89%" };
  if (grade >= 70) return { name: "Good", color: "#f1c40f", range: "70-79%" };
  if (grade >= 60) return { name: "Okay", color: "#e67e22", range: "60-69%" };
  if (grade >= 50)
    return { name: "Needs Work", color: "#d35400", range: "50-59%" };
  return { name: "Poor", color: "#c0392b", range: "< 50%" };
}

// =======================================================
//       RESULTS MODAL LOGIC (MEMORIZATION + REVISION)
// =======================================================

function getCurrentAcademicYear() {
  const today = new Date();
  if (today.getMonth() < 8)
    return `${today.getFullYear() - 1}/${today.getFullYear()}`;
  return `${today.getFullYear()}/${today.getFullYear() + 1}`;
}

async function openResultsModal(id, fullName) {
  document.getElementById("results-modal").style.display = "flex";
  document.getElementById("results-student-id").value = id;
  document.getElementById("results-student-name").innerText = fullName;

  // 1. Toggle Hifz Section
  const student = allStudentsData.find((s) => s.id === id);
  const isHifz = student && student.level.toLowerCase().includes("hifz");

  const hifzSection = document.getElementById("hifz-results-section");
  if (isHifz) {
    hifzSection.style.display = "block";
  } else {
    hifzSection.style.display = "none";
    clearHifzInputs();
  }

  // 2. Populate Years
  const yearSelect = document.getElementById("result-year");
  yearSelect.innerHTML = "";
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 3;
  for (let i = 0; i < 6; i++) {
    const y = startYear + i;
    const str = `${y}/${y + 1}`;
    yearSelect.innerHTML += `<option value="${str}">${str}</option>`;
  }
  const current = getCurrentAcademicYear();
  yearSelect.value = current;
  await fetchAndFillResults(id, current);
}

function closeResultsModal() {
  document.getElementById("results-modal").style.display = "none";
}

const resultYear = document.getElementById("result-year");
if (resultYear) {
  resultYear.addEventListener("change", (e) => {
    fetchAndFillResults(
      document.getElementById("results-student-id").value,
      e.target.value
    );
  });
}

function clearHifzInputs() {
  const ids = [
    "mem-s1-start",
    "mem-s1-end",
    "mem-s2-start",
    "mem-s2-end",
    "mem-s3-start",
    "mem-s3-end",
    "rev-s1-start",
    "rev-s1-end",
    "rev-s2-start",
    "rev-s2-end",
    "rev-s3-start",
    "rev-s3-end",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("hifz-total-display").innerText = "0";
}

async function fetchAndFillResults(id, year) {
  // Clear first
  document.getElementById("res-sem1").value = "";
  document.getElementById("res-sem2").value = "";
  document.getElementById("res-sem3").value = "";
  document.getElementById("preview-final").innerText = "...";
  document.getElementById("preview-badge").innerText = "--";
  clearHifzInputs();

  try {
    const res = await fetch(`/api/students/${id}/results?year=${year}`);
    const data = await res.json();
    if (data.academic_year) {
      // Academic
      document.getElementById("res-sem1").value = data.sem1_score || "";
      document.getElementById("res-sem2").value = data.sem2_score || "";
      document.getElementById("res-sem3").value = data.sem3_score || "";

      // Memorization
      document.getElementById("mem-s1-start").value =
        data.hifz_sem1_start || "";
      document.getElementById("mem-s1-end").value = data.hifz_sem1_end || "";
      document.getElementById("mem-s2-start").value =
        data.hifz_sem2_start || "";
      document.getElementById("mem-s2-end").value = data.hifz_sem2_end || "";
      document.getElementById("mem-s3-start").value =
        data.hifz_sem3_start || "";
      document.getElementById("mem-s3-end").value = data.hifz_sem3_end || "";

      // Revision
      document.getElementById("rev-s1-start").value =
        data.hifz_rev_s1_start || "";
      document.getElementById("rev-s1-end").value = data.hifz_rev_s1_end || "";
      document.getElementById("rev-s2-start").value =
        data.hifz_rev_s2_start || "";
      document.getElementById("rev-s2-end").value = data.hifz_rev_s2_end || "";
      document.getElementById("rev-s3-start").value =
        data.hifz_rev_s3_start || "";
      document.getElementById("rev-s3-end").value = data.hifz_rev_s3_end || "";
    }
    calculatePreview();
    calcHifzTotal();
  } catch (e) {
    console.error(e);
  }
}

// Live Calculation: (Mem * 10) + (Rev * 5)
function calcHifzTotal() {
  let total = 0;

  // Helper to calc points
  const calc = (type, sem) => {
    const startInput = document.getElementById(`${type}-s${sem}-start`);
    const endInput = document.getElementById(`${type}-s${sem}-end`);

    if (!startInput || !endInput) return 0; // Safety check

    const s = parseInt(startInput.value) || 0;
    const e = parseInt(endInput.value) || 0;

    if (e > s) {
      const pages = e - s;
      return type === "mem" ? pages * 10 : pages * 5;
    }
    return 0;
  };

  total += calc("mem", 1) + calc("mem", 2) + calc("mem", 3);
  total += calc("rev", 1) + calc("rev", 2) + calc("rev", 3);

  document.getElementById("hifz-total-display").innerText = total;
}

function calculatePreview() {
  const s1 = parseFloat(document.getElementById("res-sem1").value) || 0;
  const s2 = parseFloat(document.getElementById("res-sem2").value) || 0;
  const s3 = parseFloat(document.getElementById("res-sem3").value) || 0;

  // Calculate average
  let avg = 0;
  if (s1 || s2 || s3) {
    avg = ((s1 + s2 + s3) / 3).toFixed(2);
  }

  const cat = getGradeCategory(avg);
  document.getElementById("preview-final").innerText = avg + "%";
  const badge = document.getElementById("preview-badge");
  badge.innerText = cat.name;
  badge.style.background = cat.color;
  badge.style.color = "white";
  badge.style.padding = "2px 6px";
  badge.style.borderRadius = "4px";
}

const resultsForm = document.getElementById("results-form");
if (resultsForm) {
  resultsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("results-student-id").value;
    const body = {
      academic_year: document.getElementById("result-year").value,
      sem1: document.getElementById("res-sem1").value,
      sem2: document.getElementById("res-sem2").value,
      sem3: document.getElementById("res-sem3").value,

      // Mem Data
      hifz_mem_s1_start: document.getElementById("mem-s1-start").value,
      hifz_mem_s1_end: document.getElementById("mem-s1-end").value,
      hifz_mem_s2_start: document.getElementById("mem-s2-start").value,
      hifz_mem_s2_end: document.getElementById("mem-s2-end").value,
      hifz_mem_s3_start: document.getElementById("mem-s3-start").value,
      hifz_mem_s3_end: document.getElementById("mem-s3-end").value,

      // Rev Data
      hifz_rev_s1_start: document.getElementById("rev-s1-start").value,
      hifz_rev_s1_end: document.getElementById("rev-s1-end").value,
      hifz_rev_s2_start: document.getElementById("rev-s2-start").value,
      hifz_rev_s2_end: document.getElementById("rev-s2-end").value,
      hifz_rev_s3_start: document.getElementById("rev-s3-start").value,
      hifz_rev_s3_end: document.getElementById("rev-s3-end").value,
    };

    await fetch(`/api/students/${id}/results`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    closeResultsModal();
    showSuccess("Results Saved!");
    loadStudents();
  });
}

// --- SWITCH VIEW (Active / Pending) ---
function switchView(view) {
  currentView = view;
  document
    .getElementById("btn-view-active")
    .classList.toggle("active", view === "active");
  document
    .getElementById("btn-view-pending")
    .classList.toggle("active", view === "pending");
  document.getElementById("student-list-card").style.display =
    view === "active" ? "block" : "none";
  document.getElementById("pending-list-card").style.display =
    view === "pending" ? "block" : "none";

  if (view === "active") loadStudents();
  if (view === "pending") loadPendingStudents();
}

// --- LOAD PENDING STUDENTS ---
async function loadPendingStudents() {
  try {
    const res = await fetch("/api/students?status=pending");
    const pendingData = await res.json();
    renderPendingTable(pendingData);
  } catch (err) {
    console.error(err);
  }
}

function renderPendingTable(data) {
  const tbody = document.getElementById("pending-body");
  tbody.innerHTML = "";
  document.getElementById("pending-counter").innerText = `${data.length} New`;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#888;">No pending applications.</td></tr>`;
    return;
  }

  data.forEach((s) => {
    const row = document.createElement("tr");

    // UPDATED: Use enrolled_date for "Applied On"
    const appliedDate = s.enrolled_date
      ? new Date(s.enrolled_date).toLocaleDateString()
      : "N/A";
    const dobDate = s.dob ? new Date(s.dob).toLocaleDateString() : "N/A";

    let contact = `<div style="font-size:0.85rem; line-height:1.6;">`;
    if (s.phone)
      contact += `<div><b>M:</b> <a href="tel:${s.phone}">${s.phone}</a></div>`;
    if (s.email)
      contact += `<div><b>E:</b> <a href="mailto:${s.email}">${s.email}</a></div>`;
    contact += `</div>`;

    row.innerHTML = `
            <td style="font-size:0.9rem; color:#555;">${appliedDate}</td>
            <td style="font-weight:bold; color:#1e4d2b;">${s.first_name} ${
      s.last_name
    }</td>
            <td>${dobDate}</td>
            <td><span class="level-badge" style="background:#f39c12; color:white;">${
              s.level || "Unassigned"
            }</span></td>
            <td>${s.parent_name || "-"}</td>
            <td>${contact}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-approve" onclick="openApproveModal(${
                      s.id
                    }, '${s.first_name}', '${s.level}')">✔ Approve</button>
                    <button class="btn-delete" style="padding:6px 10px;" onclick="openDeleteModal(${
                      s.id
                    }, '${s.first_name} ${s.last_name}')">✘</button>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// --- APPROVE MODAL LOGIC ---
function openApproveModal(id, name, currentLevel) {
  studentToApproveId = id;
  levelToApprove = currentLevel;

  const modalMsg = document.getElementById("approve-modal-msg");
  if (modalMsg) {
    if (!currentLevel || currentLevel === "Unassigned") {
      modalMsg.innerHTML = `Approve <strong>${name}</strong>?<br><br><span style="font-size:0.85rem; color:#d35400; background:#fff3e0; padding:5px; border-radius:4px; display:inline-block;">⚠️ They are currently 'Unassigned'.<br>You can assign a class later.</span>`;
    } else {
      modalMsg.innerHTML = `Approve enrollment for <br><strong style="font-size:1.1rem; color:#333;">${name}</strong>?`;
    }
  }
  document.getElementById("approve-modal").style.display = "flex";
}

function closeApproveModal() {
  document.getElementById("approve-modal").style.display = "none";
  studentToApproveId = null;
  levelToApprove = null;
}

const confirmApproveBtn = document.getElementById("confirm-approve-btn");
if (confirmApproveBtn) {
  confirmApproveBtn.addEventListener("click", async () => {
    if (!studentToApproveId) return;

    try {
      const res = await fetch(`/api/students/${studentToApproveId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: levelToApprove }),
      });

      if (res.ok) {
        closeApproveModal();
        showSuccess("Student Approved Successfully!");
        loadPendingStudents(); // Refresh Pending List
      } else {
        alert("Error approving student");
      }
    } catch (err) {
      console.error(err);
    }
  });
}

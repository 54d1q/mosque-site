document.addEventListener("DOMContentLoaded", () => {
  loadLevels();
  loadTeachers();
});

let staffToDeleteId = null;

function openDeleteModal(id, name) {
  staffToDeleteId = id;
  document.getElementById("delete-staff-name").innerText = name;
  document.getElementById("delete-modal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("delete-modal").style.display = "none";
  staffToDeleteId = null;
}

// Listen for the "Remove" button click inside the modal
document
  .getElementById("confirm-delete-btn")
  .addEventListener("click", async () => {
    if (staffToDeleteId) {
      try {
        await fetch(`/api/teachers/${staffToDeleteId}`, { method: "DELETE" });
        loadTeachers(); // Refresh the list
        closeDeleteModal();
      } catch (err) {
        console.error(err);
        alert("Failed to delete");
      }
    }
  });
// --- 1. LEVEL MANAGEMENT ---

async function loadLevels() {
  try {
    const res = await fetch("/api/levels");
    const levels = await res.json();

    // Render List on the left panel
    const list = document.getElementById("levels-list");
    list.innerHTML = "";

    // Render Checkboxes in the "Add Teacher" modal
    const checkboxGroup = document.getElementById("level-checkboxes");
    checkboxGroup.innerHTML = "";

    if (levels.length === 0) {
      list.innerHTML =
        "<p style='color:#999; text-align:center;'>No levels added yet.</p>";
      checkboxGroup.innerHTML =
        "<p style='color:red;'>Please add levels first.</p>";
      return;
    }

    levels.forEach((lvl) => {
      // A. Add to list
      list.innerHTML += `
                <li>
                    <span>${lvl.name}</span>
                    <span class="delete-x" onclick="deleteLevel(${lvl.id})">&times;</span>
                </li>
            `;

      // B. Add to checkboxes for modal
      checkboxGroup.innerHTML += `
                <div class="checkbox-item">
                    <input type="checkbox" name="levelSelect" value="${lvl.id}" id="lvl-${lvl.id}">
                    <label for="lvl-${lvl.id}">${lvl.name}</label>
                </div>
            `;
    });
  } catch (err) {
    console.error(err);
  }
}

async function addLevel() {
  const input = document.getElementById("new-level-name");
  const name = input.value.trim();

  if (!name) return;

  const res = await fetch("/api/levels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (res.ok) {
    input.value = "";
    loadLevels(); // Refresh lists
  } else {
    alert("Could not add level (might already exist).");
  }
}
// --- LEVEL DELETION LOGIC ---
let levelToDeleteId = null;

// 1. Open the modal instead of using confirm()
function deleteLevel(id) {
  levelToDeleteId = id;
  document.getElementById("delete-level-modal").style.display = "flex";
}

// 2. Close the modal
function closeDeleteLevelModal() {
  levelToDeleteId = null;
  document.getElementById("delete-level-modal").style.display = "none";
}

// 3. Handle the actual deletion when "Delete" is clicked inside the modal
document
  .getElementById("confirm-delete-level-btn")
  .addEventListener("click", async () => {
    if (levelToDeleteId) {
      try {
        const res = await fetch(`/api/levels/${levelToDeleteId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadLevels(); // Refresh list
          closeDeleteLevelModal(); // Close modal
        } else {
          alert("Failed to delete level.");
        }
      } catch (err) {
        console.error(err);
      }
    }
  });

// --- 2. TEACHER MANAGEMENT ---

// --- 1. LOAD TEACHERS ---
async function loadTeachers() {
  try {
    const res = await fetch("/api/teachers");
    const teachers = await res.json();

    // Pass the data to the separate render function
    renderTeachers(teachers);
  } catch (err) {
    console.error(err);
  }
}

// --- 2. RENDER TEACHERS (New Function) ---
function renderTeachers(teachers) {
  const tbody = document.getElementById("teachers-list");
  tbody.innerHTML = "";

  teachers.forEach((t) => {
    tbody.innerHTML += `
        <tr>
            <td style="vertical-align: middle;"><strong>${
              t.username
            }</strong></td>
            <td style="vertical-align: middle;">${t.assigned_classes}</td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn-secondary" onclick="openEditModal(${
                      t.id
                    }, '${t.username}', '${t.email || ""}')" title="Edit">
                        ✏️ Edit
                    </button>
                    
                    <button class="btn-secondary" onclick="viewHistory(${
                      t.id
                    }, '${t.username}')" title="View Logs">
                        🕒 History
                    </button>
                    
                    <button class="btn-delete" onclick="openDeleteModal(${
                      t.id
                    }, '${t.username}')" title="Remove Teacher">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
      `;
  });
}

// --- 2. OPEN EDIT MODAL ---
async function openEditModal(teacherId, teacherName, teacherEmail) {
  document.getElementById("edit-modal").style.display = "flex";
  document.getElementById("edit-teacher-name").innerText = teacherName;
  document.getElementById("edit-teacher-id").value = teacherId;
  document.getElementById("edit-teacher-email").value = teacherEmail; // Set Email value

  const checkboxContainer = document.getElementById("edit-level-checkboxes");
  checkboxContainer.innerHTML = "<p>Loading...</p>";

  try {
    // A. Fetch ALL Levels (to build the list)
    const levelsRes = await fetch("/api/levels");
    const allLevels = await levelsRes.json();

    // B. Fetch CURRENT assigned IDs for this teacher
    const currentRes = await fetch(`/api/teachers/${teacherId}/levels`);
    const currentIds = await currentRes.json(); // e.g. [1, 5]

    // C. Build the Checkboxes
    checkboxContainer.innerHTML = "";

    if (allLevels.length === 0) {
      checkboxContainer.innerHTML = "<p>No levels defined.</p>";
      return;
    }

    allLevels.forEach((lvl) => {
      // Check if this level is currently assigned
      const isChecked = currentIds.includes(lvl.id) ? "checked" : "";

      checkboxContainer.innerHTML += `
                <div class="checkbox-item">
                    <input type="checkbox" name="editLevelSelect" value="${lvl.id}" id="edit-lvl-${lvl.id}" ${isChecked}>
                    <label for="edit-lvl-${lvl.id}">${lvl.name}</label>
                </div>
            `;
    });
  } catch (err) {
    console.error(err);
  }
}

// --- 3. SAVE CHANGES ---
document
  .getElementById("edit-teacher-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const teacherId = document.getElementById("edit-teacher-id").value;
    const email = document.getElementById("edit-teacher-email").value; // Get Email
    const checkboxes = document.querySelectorAll(
      'input[name="editLevelSelect"]:checked'
    );
    const levelIds = Array.from(checkboxes).map((cb) => cb.value);

    try {
      // 1. Update Levels (Existing logic)
      const levelRes = await fetch(`/api/teachers/${teacherId}/levels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelIds }),
      });

      // 2. Update Info (New Email Logic)
      const infoRes = await fetch(`/api/teachers/${teacherId}/info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (levelRes.ok && infoRes.ok) {
        closeEditModal();
        loadTeachers();
      } else {
        // Try to get error message from info response if it failed
        const infoData = await infoRes.json().catch(() => ({}));
        alert("Failed to update: " + (infoData.message || "Check connection"));
      }
    } catch (err) {
      console.error(err);
    }
  });

function closeEditModal() {
  document.getElementById("edit-modal").style.display = "none";
}

// B. Add these new functions to handle the History Logic
let currentLogs = []; // Store logs to allow filtering

async function viewHistory(id, name) {
  document.getElementById("history-title").innerText = `Login History: ${name}`;
  document.getElementById("history-modal").style.display = "flex";
  document.getElementById("history-list").innerHTML =
    "<tr><td colspan='2'>Loading...</td></tr>";

  try {
    const res = await fetch(`/api/teachers/${id}/logs`);
    currentLogs = await res.json();
    renderLogs(currentLogs);
  } catch (err) {
    console.error(err);
  }
}

function renderLogs(logs) {
  const tbody = document.getElementById("history-list");
  tbody.innerHTML = "";

  if (logs.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='2' style='text-align:center; color:#999;'>No login records found.</td></tr>";
    return;
  }

  logs.forEach((log) => {
    const dateObj = new Date(log.login_time);
    const dateStr = dateObj.toLocaleDateString("en-GB"); // DD/MM/YYYY
    const timeStr = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    tbody.innerHTML += `
            <tr>
                <td>${dateStr}</td>
                <td style="color:#1e4d2b; font-weight:bold;">${timeStr}</td>
            </tr>
        `;
  });
}

// C. Filter Logic
function filterLogs() {
  const selectedDate = document.getElementById("history-date-filter").value; // YYYY-MM-DD
  if (!selectedDate) return renderLogs(currentLogs);

  const filtered = currentLogs.filter((log) => {
    const logDate = new Date(log.login_time).toISOString().split("T")[0];
    return logDate === selectedDate;
  });
  renderLogs(filtered);
}

function clearDateFilter() {
  document.getElementById("history-date-filter").value = "";
  renderLogs(currentLogs);
}

function closeHistoryModal() {
  document.getElementById("history-modal").style.display = "none";
}

// Add Teacher (With Multi-Level Logic)
document
  .getElementById("add-teacher-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("new-username").value;
    const email = document.getElementById("new-email").value; // <--- NEW
    const password = document.getElementById("new-password").value;

    // Get all checked checkboxes
    const checkboxes = document.querySelectorAll(
      'input[name="levelSelect"]:checked'
    );
    const levelIds = Array.from(checkboxes).map((cb) => cb.value);

    if (levelIds.length === 0) {
      alert("Please select at least one class level.");
      return;
    }

    // Send Email along with other data
    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, levelIds }), // <--- ADDED email
    });

    if (res.ok) {
      closeAddModal();
      loadTeachers();
      document.getElementById("add-teacher-form").reset();
    } else {
      const err = await res.json();
      alert("Failed: " + (err.message || "Could not create teacher"));
    }
  });

// Delete Teacher
async function deleteTeacher(id, name) {
  if (confirm(`Remove ${name} from staff?`)) {
    const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
    if (res.ok) loadTeachers();
  }
}

// Modal Helpers
function openAddModal() {
  document.getElementById("add-modal").style.display = "flex";
}
function closeAddModal() {
  document.getElementById("add-modal").style.display = "none";
}
// --- PASSWORD STRENGTH CHECKER ---
document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("new-password");

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      const val = this.value;

      // 1. Check Length (8+)
      updateRequirement("req-len", val.length >= 8);

      // 2. Check Uppercase
      updateRequirement("req-upper", /[A-Z]/.test(val));

      // 3. Check Lowercase
      updateRequirement("req-lower", /[a-z]/.test(val));

      // 4. Check Number
      updateRequirement("req-num", /\d/.test(val));
      // 5. Check Special Character
      updateRequirement("req-spec", /[\W_]/.test(val));
    });
  }
});

function updateRequirement(elementId, isValid) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (isValid) {
    el.style.color = "#27ae60"; // Green
    el.style.fontWeight = "bold";
    // Replace bullet with Checkmark if not already there
    if (!el.innerHTML.includes("✔")) {
      el.innerHTML = el.innerHTML.replace("•", "✔");
    }
  } else {
    el.style.color = "#777"; // Back to Grey
    el.style.fontWeight = "normal";
    // Revert to bullet
    if (el.innerHTML.includes("✔")) {
      el.innerHTML = el.innerHTML.replace("✔", "•");
    }
  }
}

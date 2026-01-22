const monthList = [
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

let allStudentsData = [];
let pendingPayment = null; // Stores data while modal is open

document.addEventListener("DOMContentLoaded", () => {
  const date = new Date();
  document.getElementById("fee-year").value = date.getFullYear();
  loadFeesGrid();

  // Listeners
  document.getElementById("fee-year").addEventListener("input", loadFeesGrid);

  // Use 'input' instead of 'keyup' for better responsiveness (handles paste/x button)
  document
    .getElementById("search-student")
    .addEventListener("input", applyFilters);
  document
    .getElementById("search-parent")
    .addEventListener("input", applyFilters);

  // Modal Confirm Button Listener
  document
    .getElementById("confirm-payment-btn")
    .addEventListener("click", processPayment);
});

async function loadFeesGrid() {
  const year = document.getElementById("fee-year").value;
  const tbody = document.getElementById("fees-grid-body");

  // Optional: Only show loading if table is empty to prevent flickering on updates
  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px;">Loading data...</td></tr>`;
  }

  try {
    const res = await fetch(`/api/fees?year=${year}`);
    const rawData = await res.json();

    const studentsMap = {};
    rawData.forEach((row) => {
      if (!studentsMap[row.id]) {
        studentsMap[row.id] = {
          id: row.id,
          name: `${row.first_name} ${row.last_name}`,
          parent: row.parent_name || "",
          level: row.level,
          payments: {},
        };
      }
      if (row.month && row.is_paid) {
        studentsMap[row.id].payments[row.month] = true;
      }
    });

    allStudentsData = Object.values(studentsMap);

    // --- THE FIX IS HERE ---
    // Instead of rendering everything, re-apply the current search filters
    applyFilters();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="13" style="color:red; text-align:center;">Error loading data</td></tr>`;
  }
}

function applyFilters() {
  // Get current values from the search bars
  const studentTerm = document
    .getElementById("search-student")
    .value.toLowerCase();
  const parentTerm = document
    .getElementById("search-parent")
    .value.toLowerCase();

  // Filter the global data
  const filtered = allStudentsData.filter((s) => {
    const matchesStudent = s.name.toLowerCase().includes(studentTerm);
    const matchesParent = s.parent.toLowerCase().includes(parentTerm);
    return matchesStudent && matchesParent;
  });

  // Render only the filtered results
  renderTable(filtered);
}

function renderTable(data) {
  const tbody = document.getElementById("fees-grid-body");
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px;">No matching records found.</td></tr>`;
    return;
  }

  data.forEach((student) => {
    const tr = document.createElement("tr");

    let html = `
            <td class="sticky-col">
                <div style="font-weight:bold;">${student.name}</div>
                <div class="level-span">${student.level || ""}</div>
                <div style="font-size:0.75rem; color:#666;">Parent: ${
                  student.parent
                }</div>
            </td>
        `;

    monthList.forEach((month) => {
      const isPaid = student.payments[month] === true;
      const btnClass = isPaid ? "paid" : "unpaid";
      const btnText = isPaid ? "Paid" : "Pay";

      // Escape quotes in names to prevent JS errors in onclick
      const safeName = student.name.replace(/'/g, "\\'");

      html += `
                <td>
                    <button class="status-btn ${btnClass}" 
                            onclick="handleFeeClick(${
                              student.id
                            }, '${safeName}', '${month}', ${!isPaid})">
                        ${btnText}
                    </button>
                </td>
            `;
    });

    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
}

// --- NEW MODAL LOGIC ---

function handleFeeClick(studentId, studentName, month, newStatus) {
  if (newStatus === true) {
    // If marking as PAID -> Open Modal
    pendingPayment = { studentId, month, newStatus };

    document.getElementById("modal-student-name").innerText = studentName;
    document.getElementById("modal-month-name").innerText = month;
    document.getElementById("payment-modal").style.display = "flex";
  } else {
    // If marking as UNPAID (Undo) -> Do it immediately without modal
    updateFee(studentId, month, newStatus);
  }
}

function closePaymentModal() {
  document.getElementById("payment-modal").style.display = "none";
  pendingPayment = null;
}

// Called when "Confirm" is clicked inside the modal
async function processPayment() {
  if (pendingPayment) {
    await updateFee(
      pendingPayment.studentId,
      pendingPayment.month,
      pendingPayment.newStatus
    );
    closePaymentModal();
  }
}

// The actual API Call
async function updateFee(studentId, month, newStatus) {
  const year = document.getElementById("fee-year").value;

  try {
    await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        month: month,
        year: year,
        amount: 50,
        is_paid: newStatus,
      }),
    });

    // Refresh data but keep the search filter active
    loadFeesGrid();
  } catch (err) {
    console.error(err);
    alert("Update failed");
  }
}

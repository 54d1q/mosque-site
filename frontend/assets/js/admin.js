document.addEventListener("DOMContentLoaded", () => {
  const userRole = localStorage.getItem("userRole");

  if (!userRole) {
    window.location.href = "/login";
  } else if (userRole !== "admin" && userRole !== "headteacher") {
    // Teachers shouldn't see the full dashboard, send them to their portal
    window.location.href = "/admin/attendance";
  }
});

// 2. Sync with Global Logout
function logout() {
  // 1. Remove the user object we just created
  localStorage.removeItem("user");

  // 2. Clear old legacy keys
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");

  // 3. Redirect to the homepage
  window.location.href = "/";
}

// 3. Synchronized Password Modal Logic
function openPasswordModal() {
  const modal = document.getElementById("password-modal");
  if (modal) modal.style.display = "flex";
}

function closePasswordModal() {
  const modal = document.getElementById("password-modal");
  if (modal) {
    modal.style.display = "none";
    // Clear the status message so it's fresh for next time
    const msg = document.getElementById("reset-msg");
    if (msg) msg.innerText = "";
  }
}

// 4. Request Reset Link Function
async function requestResetLink() {
  const userId = localStorage.getItem("userId");
  const btn = document.querySelector("#password-modal button");
  const msg = document.getElementById("reset-msg");

  if (!userId) {
    alert("Session error. Please log in again.");
    window.location.href = "/login";
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
    console.error("Connection Error:", err);
    msg.style.color = "red";
    msg.innerText = "❌ Connection Error. Please try again.";
    btn.disabled = false;
    btn.innerText = "Send Reset Link";
  }
}

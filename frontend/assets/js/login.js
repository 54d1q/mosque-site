document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("error-msg");
  const btn = document.querySelector(".btn-login");

  // Reset UI
  errorMsg.innerText = "";
  btn.innerText = "Checking...";
  btn.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      // 1. Combine everything into one clean object
      const userData = {
        id: data.user?.id,
        role: data.user?.role,
        name: data.user?.username,
      };

      // 2. Save the main object as a JSON string
      localStorage.setItem("user", JSON.stringify(userData));

      // 3. Keep these temporarily for transition
      localStorage.setItem("userRole", userData.role);
      localStorage.setItem("userId", userData.id);
      localStorage.setItem("username", userData.name);

      // 4. Redirect based on role
      window.location.href =
        userData.role === "admin" || userData.role === "headteacher"
          ? "/admin"
          : "/admin/attendance";
    } else {
      // ... error handling ...
      errorMsg.innerText = "❌ " + data.message;
      btn.innerText = "Secure Login 🔒";
      btn.disabled = false;
    }
  } catch (error) {
    console.error(error);
    errorMsg.innerText = "⚠️ Server connection failed";
    btn.innerText = "Secure Login 🔒";
    btn.disabled = false;
  }
});

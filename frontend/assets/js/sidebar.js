document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle"); // Desktop Button
  const mobileBtn = document.getElementById("mobile-menu-btn"); // Mobile Button

  // --- 1. DESKTOP TOGGLE LOGIC (Collapse/Expand) ---
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      // Optional: Save preference
      const isCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("sidebar-collapsed", isCollapsed);
    });
  }

  // Restore Desktop State on Load
  const savedState = localStorage.getItem("sidebar-collapsed");
  if (savedState === "true" && window.innerWidth > 768) {
    sidebar.classList.add("collapsed");
  }

  // --- 2. MOBILE MENU LOGIC (Dropdown) ---
  if (mobileBtn) {
    mobileBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Stop click from triggering the close listener immediately

      sidebar.classList.toggle("active"); // Show/Hide Menu
      mobileBtn.classList.toggle("open"); // Animate Hamburger
    });
  }

  // Close Mobile Menu when clicking outside
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("active")) {
      // If click is NOT inside sidebar AND NOT on the button
      if (!sidebar.contains(e.target) && !mobileBtn.contains(e.target)) {
        sidebar.classList.remove("active");
        mobileBtn.classList.remove("open");
      }
    }
  });
});

// Logout Helper
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  window.location.href = "/";
}

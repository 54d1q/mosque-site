document.addEventListener("DOMContentLoaded", () => {
  // --- STRIPE INITIALIZATION ---
  let stripe;
  let elements;

  async function initializeStripe() {
    try {
      const response = await fetch("/config");
      const { publishableKey } = await response.json();
      stripe = Stripe(publishableKey);

      // Now call your form loading logic here
      loadStripeForm(currentAmount);
    } catch (err) {}
  }
  initializeStripe();

  // --- 1. Amount Logic ---
  const amtBtns = document.querySelectorAll(".amt-btn");
  const customInput = document.getElementById("custom-amount");
  const totalDisplay = document.getElementById("donate-total");
  let currentAmount = 20; // Default

  // Function to update UI and fetch new Payment Intent
  function updateState(val) {
    if (!val || val < 1) return; // Prevent invalid amounts
    currentAmount = val;
    totalDisplay.innerText = `£${val}`;

    // Reload Stripe form with new amount
    loadStripeForm(val);
  }

  amtBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      amtBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      customInput.value = "";
      updateState(btn.dataset.val);
    });
  });

  // Debounce custom input
  let timeoutId;
  customInput.addEventListener("input", (e) => {
    amtBtns.forEach((b) => b.classList.remove("active"));
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      updateState(e.target.value);
    }, 500);
  });

  // --- 2. Load Stripe Elements ---
  async function loadStripeForm(amount) {
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount }),
      });

      const { clientSecret } = await response.json();

      const appearance = { theme: "stripe" };
      elements = stripe.elements({ appearance, clientSecret });

      const paymentElement = elements.create("payment");
      paymentElement.mount("#payment-element");
    } catch (error) {
      console.error("Error setting up payment:", error);
    }
  }

  // --- 3. Payment Method Tabs ---
  const tabs = document.querySelectorAll(".pay-tab");
  const contents = document.querySelectorAll(".payment-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.target;
      contents.forEach((c) => c.classList.remove("active"));
      document.getElementById(`${target}-form`).classList.add("active");
    });
  });

  // --- 4. Handle Real Submission ---
  const cardForm = document.getElementById("card-form");
  const submitBtn = document.querySelector(".donate-submit-btn");

  cardForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Lock the button
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Processing...";

    // 2. Confirm Payment with Stripe
    // We use 'if_required' so it doesn't redirect unless the bank forces it (3D Secure)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // If bank requires redirect, come back here
      },
      redirect: "if_required",
    });

    // 3. Handle Result
    if (error) {
      // --- FAILURE ---
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Donate £${currentAmount}`;
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Update the overlay text to be specific (Optional)
      const successTitle = document.querySelector("#success-overlay h2");
      const successMsg = document.querySelector("#success-overlay p");
      if (successTitle) successTitle.innerText = "Jazakallah Khair!";
      if (successMsg)
        successMsg.innerText = "Thank you for your generous donation.";

      // Show the Success Overlay
      document.getElementById("success-overlay").classList.add("active");

      // Reset Button State (behind the overlay)
      submitBtn.innerHTML = "Donated ✔";
    }
  });

  // Initialize with default amount
  updateState(10);
});

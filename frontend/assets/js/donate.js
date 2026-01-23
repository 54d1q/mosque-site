document.addEventListener("DOMContentLoaded", () => {
  // --- VARIABLES ---
  let stripe;
  let elements;
  let currentBaseAmount = 10; // Default donation amount

  // --- DOM ELEMENTS ---
  const amtBtns = document.querySelectorAll(".amt-btn");
  const customInput = document.getElementById("custom-amount");
  const totalDisplay = document.getElementById("donate-total");
  const cardForm = document.getElementById("card-form");
  const submitBtn = document.querySelector(".donate-submit-btn");
  const feeCheckbox = document.getElementById("cover-fee-checkbox");
  const feeDisplay = document.getElementById("fee-amount");

  // --- 1. INITIALIZATION ---
  async function initializeStripe() {
    try {
      // Fetch your Publishable Key from backend
      const response = await fetch("/config");
      const { publishableKey } = await response.json();
      stripe = Stripe(publishableKey);

      // Initialize form with default £10
      updateState(10);
    } catch (err) {
      console.error("Error initializing Stripe:", err);
    }
  }
  initializeStripe();

  // --- 2. FEE CALCULATION LOGIC ---

  // Formula for UK Charities (1.2% + 20p)
  // Calculate what TOTAL is needed so that after fees, the Mosque gets the exact base amount.
  // Formula: Total = (Base + 0.20) / (1 - 0.012)
  function calculateFee(amount) {
    if (!amount || amount <= 0) return 0;
    // 0.988 is derived from 100% - 1.2%
    const totalNeeded = (amount + 0.2) / 0.988;
    return totalNeeded - amount;
  }

  // --- 3. STATE UPDATE FUNCTION ---
  function updateState(val) {
    // A. Validate Input
    let amount = parseFloat(val);
    if (!amount || amount < 1) return;
    currentBaseAmount = amount;

    // B. Calculate Fee
    const fee = calculateFee(currentBaseAmount);

    // C. Update Checkbox Label
    if (feeDisplay) {
      feeDisplay.innerText = `£${fee.toFixed(2)}`;
    }

    // D. Determine Final Charge Amount
    let finalTotal = currentBaseAmount;
    if (feeCheckbox && feeCheckbox.checked) {
      finalTotal = currentBaseAmount + fee;
    }

    // E. Update Donate Button Text
    if (totalDisplay) {
      totalDisplay.innerText = `£${finalTotal.toFixed(2)}`;
    }

    // F. Update Stripe Intent (Silent Background Update)
    loadStripeForm(finalTotal);
  }

  // --- 4. EVENT LISTENERS ---

  // Button Clicks (£10, £20, etc.)
  amtBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // UI Toggle
      amtBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      customInput.value = ""; // Clear custom input

      // Update Logic
      updateState(parseFloat(btn.dataset.val));
    });
  });

  // Custom Input (Type your own amount)
  let timeoutId;
  customInput.addEventListener("input", (e) => {
    // Remove active class from buttons
    amtBtns.forEach((b) => b.classList.remove("active"));

    // Debounce to prevent too many API calls while typing
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const val = parseFloat(e.target.value);
      if (val >= 1) {
        updateState(val);
      }
    }, 500);
  });

  // Fee Checkbox Toggle
  if (feeCheckbox) {
    feeCheckbox.addEventListener("change", () => {
      // Recalculate based on checkbox state (Checked/Unchecked)
      updateState(currentBaseAmount);
    });
  }

  // --- 5. STRIPE BACKEND COMMUNICATION ---
  async function loadStripeForm(amount) {
    try {
      // Request a PaymentIntent from your server
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount }), // We send the Float (e.g. 10.32)
      });

      const { clientSecret } = await response.json();

      // Setup Stripe Elements Appearance
      const appearance = { theme: "stripe" };

      // Re-initialize Elements with new secret
      elements = stripe.elements({ appearance, clientSecret });

      const paymentElement = elements.create("payment");
      paymentElement.mount("#payment-element");
    } catch (error) {
      console.error("Error setting up payment:", error);
    }
  }

  // --- 6. SUBMIT HANDLER ---
  cardForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Disable button to prevent double clicks
    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    // Confirm Payment
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/thankyou`,
      },
      redirect: "if_required",
    });

    if (error) {
      // Show Error
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.innerText = `Donate £${currentBaseAmount}`; // Reset text
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Show Success Overlay
      document.getElementById("success-overlay").classList.add("active");
      submitBtn.innerText = "Donated ✔";
    }
  });
});

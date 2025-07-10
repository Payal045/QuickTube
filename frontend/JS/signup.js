document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const backendURL = "http://127.0.0.1:5000";

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const response = await fetch(`${backendURL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      alert("Signup successful! Please log in.");
      window.location.href = "index.html"; // Adjust path if needed
    } else {
      const error = await response.json();
      alert(error.message || "Signup failed. Try again.");
    }
  } catch (err) {
    console.error("Signup error:", err);
    alert("Something went wrong. Please try again later.");
  }
});

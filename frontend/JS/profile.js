document.addEventListener('DOMContentLoaded', async () => {
  const API = 'http://localhost:5000/api';
  const token = localStorage.getItem('jwt');            // ← stay consistent

  if (!token) return redirectToLogin();

  try {
    const res = await fetch(`${API}/auth/profile`, {
      headers: authHeaders(token)
    });

    if (res.status === 401 || res.status === 403) {
      return redirectToLogin();
    }
    if (!res.ok) throw new Error('Failed to load profile');

    const { firstName, lastName, dob, email, phone } = await res.json();

    document.querySelector('#firstName').value = firstName ?? '';
    document.querySelector('#lastName').value  = lastName  ?? '';
    document.querySelector('#dob').value       = dob ? dob.slice(0, 10) : ''; // yyyy‑mm‑dd
    document.querySelector('#email').value     = email    ?? '';
    document.querySelector('#phone').value     = phone    ?? '';

  } catch (err) {
    alert(`Profile load error: ${err.message}`);
  }
});

document.querySelector('#profileForm').addEventListener('submit', async e => {
  e.preventDefault();

  const API = 'http://localhost:5000/api';
  const token = localStorage.getItem('jwt');
  if (!token) return redirectToLogin();

  const payload = {
    firstName: document.querySelector('#firstName').value.trim(),
    lastName : document.querySelector('#lastName').value.trim(),
    dob      : document.querySelector('#dob').value,
    phone    : document.querySelector('#phone').value.trim()
  };

  try {
    const res = await fetch(`${API}/auth/profile`, {
      method : 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      return redirectToLogin();
    }
    if (!res.ok) throw new Error('Update failed');

    alert('Profile updated successfully!');
  } catch (err) {
    alert(`Failed to update profile: ${err.message}`);
  }
});

/* ---------- helpers ---------- */
function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function redirectToLogin() {
  localStorage.removeItem('jwt');
  location.href = 'login.html';        // adjust path if needed
}

function logout() {
  localStorage.removeItem('jwt');
  location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- DOM refs ---------- */
  const urlInput      = document.getElementById('video-url');
  const summarizeBtn  = document.getElementById('summarize-btn');
  const summaryArea   = document.getElementById('summary');
  const summaryPoints = document.getElementById('summary-points');

  const API  = 'http://127.0.0.1:5000/api';
  const jwt  = localStorage.getItem('jwt');        // keep naming consistent

  /* ---------- main click ---------- */
  summarizeBtn.addEventListener('click', async () => {
    const videoUrl = urlInput.value.trim();

    if (!videoUrl) {
      alert('Please enter a YouTube video URL');
      return;
    }

    // UI feedback
    summarizeBtn.disabled = true;
    summaryArea.value     = 'Loading summary…';
    summaryPoints.innerHTML = '';

    try {
      const res = await fetch(`${API}/summary/summarize`, {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
        },
        body: JSON.stringify({ videoUrl })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      if (!data.summary) throw new Error('Summary missing in response');

      /* ---------- render result ---------- */
      summaryArea.value = data.summary;

      // Optional: if backend returns an array `keyPoints`
      if (Array.isArray(data.keyPoints)) {
        data.keyPoints.forEach(addToKeyPoints);
      }

    } catch (err) {
      console.error('Summarize error:', err);
      summaryArea.value = 'Error fetching summary. Please try again.';
    } finally {
      summarizeBtn.disabled = false;
    }
  });

  /* ---------- helper ---------- */
  function addToKeyPoints(point) {
    const li = document.createElement('li');
    li.textContent = point;
    summaryPoints.appendChild(li);
  }

  /* ---------- dropdown behaviour ---------- */
  const menuBtn = document.querySelector('.menu-button');
  const dropdown = document.querySelector('.dropdown-content');

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', e => {
      if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  }
});

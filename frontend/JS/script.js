document.addEventListener('DOMContentLoaded', () => {
  /* ---------- DOM refs ---------- */
  const urlInput      = document.getElementById('video-url');
  const summarizeBtn  = document.getElementById('summarize-btn');
  const summaryArea   = document.getElementById('summary');
  const summaryPoints = document.getElementById('summary-points');

  const API  = 'https://quicktube-7d85.onrender.com/api';
  const jwt  = localStorage.getItem('jwt');  // Can be used for future auth routes

  /* ---------- main click ---------- */
  summarizeBtn.addEventListener('click', async () => {
    const videoUrl = urlInput.value.trim();
    if (!videoUrl) {
      alert('Please enter a YouTube video URL');
      return;
    }

    // UI feedback
    summarizeBtn.disabled = true;
    summaryArea.value = '';
    summaryArea.placeholder = '⏳ Fetching summary...';
    summaryPoints.innerHTML = '';

    try {
      const response = await fetch(`${API}/summary/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
        },
        body: JSON.stringify({ videoUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (!data.summary) {
        throw new Error('No summary found in response.');
      }

      // Display summary
      summaryArea.value = data.summary;

      // Display optional key points (if added later)
      if (Array.isArray(data.keyPoints)) {
        data.keyPoints.forEach(addToKeyPoints);
      }

    } catch (err) {
      console.error('❌ Summarize Error:', err);
      summaryArea.value = '';
      summaryArea.placeholder = '❌ Error fetching summary. Try again.';
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

  /* ---------- dropdown behavior ---------- */
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

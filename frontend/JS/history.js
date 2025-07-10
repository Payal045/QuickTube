document.addEventListener("DOMContentLoaded", () => {
  const historyTableBody = document.querySelector("#historyTable tbody");
  const loader = document.getElementById("loader");

  const API = "http://localhost:5000/api";
  const token = localStorage.getItem("jwt");              // ← assume JWT stored at login

  const fetchHistory = async () => {
    loader.textContent = "Loading…";
    loader.style.display = "block";
    historyTableBody.innerHTML = "";                      // clear previous rows

    try {
      const res = await fetch(`${API}/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const history = await res.json();
      loader.style.display = "none";

      if (!history.length) {
        historyTableBody.innerHTML =
          `<tr class="empty-row"><td colspan="3" style="text-align:center;">No history found</td></tr>`;
        return;
      }

      history.forEach((item, idx) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${idx + 1}</td>
          <td>${item.query}</td>
          <td>${new Date(item.date).toLocaleString(undefined, {
                year:'numeric', month:'short', day:'numeric',
                hour:'2-digit', minute:'2-digit'
          })}</td>`;
        historyTableBody.appendChild(row);
      });
    } catch (err) {
      console.error("Fetch history failed:", err);
      loader.textContent = "Failed to load history. Please try again later.";
    }
  };

  fetchHistory();
});

/* ==========================================================================
   Control Room Alert Monitoring System — script.js
   ONE shared file loaded by every page (index/add/view/search/stats).
   Each section below only runs if the matching elements exist on the
   current page, so this file safely works across all 5 pages.
   All data lives in the browser's Local Storage — no backend involved.
   ========================================================================== */

const STORAGE_KEY = "cram_alerts"; // "cram" = Control Room Alert Monitoring

/* ==========================================================================
   LOCAL STORAGE HELPERS (used by every page)
   ========================================================================== */

function getAlerts() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error("Could not read saved alerts, resetting.", err);
    return [];
  }
}

function saveAlerts(alerts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

// Basic HTML-escaping so typed text can never break table markup
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ==========================================================================
   DATE / TIME HELPERS
   ========================================================================== */

function setCurrentDateTime(inputEl) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  inputEl.value =
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) +
    "T" + pad(now.getHours()) + ":" + pad(now.getMinutes());
}

function formatDisplayDateTime(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d)) return value;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Live clock in the top bar — present on every page
function tickClock() {
  const liveClock = document.getElementById("liveClock");
  if (!liveClock) return;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  liveClock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
tickClock();
setInterval(tickClock, 1000);

/* ==========================================================================
   STATS (used on index.html and stats.html)
   ========================================================================== */

function renderStats() {
  const alerts = getAlerts();
  const total = alerts.length;
  const open = alerts.filter((a) => a.status === "Open").length;
  const closed = alerts.filter((a) => a.status === "Closed").length;
  const inProgress = alerts.filter((a) => a.status === "In Progress").length;
  const high = alerts.filter((a) => a.priority === "High").length;
  const medium = alerts.filter((a) => a.priority === "Medium").length;
  const low = alerts.filter((a) => a.priority === "Low").length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("statTotal", total);
  setText("statOpen", open);
  setText("statClosed", closed);
  setText("statHigh", high);

  // Extra breakdown, only present on stats.html
  setText("countHigh", high);
  setText("countMedium", medium);
  setText("countLow", low);
  setText("countStatusOpen", open);
  setText("countStatusProgress", inProgress);
  setText("countStatusClosed", closed);
}

renderStats();

/* ==========================================================================
   ADD ALERT PAGE (add.html)
   ========================================================================== */

const alertForm = document.getElementById("alertForm");

if (alertForm) {
  const alertIdInput = document.getElementById("alertId");
  const alertDateTimeInput = document.getElementById("alertDateTime");
  const alertLocationInput = document.getElementById("alertLocation");
  const alertTypeInput = document.getElementById("alertType");
  const alertPriorityInput = document.getElementById("alertPriority");
  const alertStatusInput = document.getElementById("alertStatus");
  const formMessage = document.getElementById("formMessage");
  const addAlertBtn = document.getElementById("addAlertBtn");
  const clearFormBtn = document.getElementById("clearFormBtn");

  // If the URL looks like add.html?edit=ALM-1042, we're editing an existing alert
  const urlParams = new URLSearchParams(window.location.search);
  let editingId = urlParams.get("edit");

  function showMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = "form-message " + type; // "success" or "error"
  }

  function clearFieldErrors() {
    [alertIdInput, alertDateTimeInput, alertLocationInput, alertTypeInput].forEach((el) =>
      el.classList.remove("input-error")
    );
  }

  function validateForm() {
    clearFieldErrors();
    const errors = [];

    const id = alertIdInput.value.trim();
    const dateTime = alertDateTimeInput.value;
    const location = alertLocationInput.value.trim();
    const type = alertTypeInput.value;

    if (!id) {
      errors.push("Alert ID is required.");
      alertIdInput.classList.add("input-error");
    } else {
      const alerts = getAlerts();
      const duplicate = alerts.some((a) => a.id.toLowerCase() === id.toLowerCase() && a.id !== editingId);
      if (duplicate) {
        errors.push("This Alert ID already exists. Use a unique Alert ID.");
        alertIdInput.classList.add("input-error");
      }
    }

    if (!dateTime) {
      errors.push("Date & Time is required.");
      alertDateTimeInput.classList.add("input-error");
    }

    if (!location) {
      errors.push("Location is required.");
      alertLocationInput.classList.add("input-error");
    }

    if (!type) {
      errors.push("Please select an Alert Type.");
      alertTypeInput.classList.add("input-error");
    }

    if (errors.length > 0) {
      showMessage(errors[0], "error");
      return false;
    }
    return true;
  }

  // If editing, pre-fill the form with the existing alert's data
  function loadEditTarget() {
    if (!editingId) return;
    const alerts = getAlerts();
    const alert = alerts.find((a) => a.id === editingId);
    if (!alert) {
      editingId = null;
      return;
    }
    alertIdInput.value = alert.id;
    alertIdInput.disabled = true; // Alert ID should not change while editing
    alertDateTimeInput.value = alert.dateTime;
    alertLocationInput.value = alert.location;
    alertTypeInput.value = alert.type;
    alertPriorityInput.value = alert.priority;
    alertStatusInput.value = alert.status;

    document.querySelector(".panel-header h2").textContent = "Edit Alert";
    addAlertBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Update';
  }

  if (!editingId) setCurrentDateTime(alertDateTimeInput);
  loadEditTarget();

  alertForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    const alerts = getAlerts();
    const alertData = {
      id: alertIdInput.value.trim(),
      dateTime: alertDateTimeInput.value,
      location: alertLocationInput.value.trim(),
      type: alertTypeInput.value,
      priority: alertPriorityInput.value,
      status: alertStatusInput.value,
    };

    if (editingId) {
      const index = alerts.findIndex((a) => a.id === editingId);
      if (index !== -1) {
        alerts[index] = alertData;
        saveAlerts(alerts);
        showMessage(`Alert "${alertData.id}" updated successfully. Redirecting to View Alerts...`, "success");
      }
    } else {
      alerts.unshift(alertData); // newest alert appears first
      saveAlerts(alerts);
      showMessage(`Alert "${alertData.id}" added successfully. Redirecting to View Alerts...`, "success");
    }

    // Redirect to the View Alerts page shortly after success,
    // like a normal multi-page website would after submitting a form.
    setTimeout(() => {
      window.location.href = "view.html";
    }, 1200);
  });

  clearFormBtn.addEventListener("click", function () {
    alertForm.reset();
    clearFieldErrors();
    setCurrentDateTime(alertDateTimeInput);
    alertPriorityInput.value = "Medium";
    alertStatusInput.value = "Open";
    showMessage("Form cleared.", "success");
  });
}

/* ==========================================================================
   SHARED TABLE RENDERING (used by view.html and search.html)
   ========================================================================== */

function buildRowHtml(alert) {
  return `
    <td class="col-indicator"><span class="priority-strip ${alert.priority}"></span></td>
    <td class="cell-id">${escapeHtml(alert.id)}</td>
    <td class="cell-datetime">${formatDisplayDateTime(alert.dateTime)}</td>
    <td>${escapeHtml(alert.location)}</td>
    <td>${escapeHtml(alert.type)}</td>
    <td><span class="badge badge-${alert.priority}">${alert.priority}</span></td>
    <td>
      <select class="status-select" data-id="${escapeHtml(alert.id)}">
        <option value="Open" ${alert.status === "Open" ? "selected" : ""}>Open</option>
        <option value="In Progress" ${alert.status === "In Progress" ? "selected" : ""}>In Progress</option>
        <option value="Closed" ${alert.status === "Closed" ? "selected" : ""}>Closed</option>
      </select>
    </td>
    <td class="col-actions">
      <div class="row-actions">
        <a class="icon-btn edit-btn" href="add.html?edit=${encodeURIComponent(alert.id)}" title="Edit alert">
          <i class="fa-solid fa-pen"></i>
        </a>
        <button class="icon-btn delete-btn" data-id="${escapeHtml(alert.id)}" title="Delete alert">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </td>
  `;
}

function wireTablePage(options) {
  const alertsTableBody = document.getElementById("alertsTableBody");
  const alertsTable = document.getElementById("alertsTable");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const pageMessage = document.getElementById("pageMessage");

  if (!alertsTableBody) return; // not on a table page

  function showPageMessage(text) {
    if (!pageMessage) return;
    pageMessage.textContent = text;
    pageMessage.className = "form-message page-message success";
    setTimeout(() => {
      pageMessage.className = "form-message page-message";
      pageMessage.textContent = "";
    }, 3000);
  }

  function render() {
    const alerts = getAlerts();
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // On the dedicated Search page, show nothing until the user types something.
    // On the View Alerts page (no search box), always show everything.
    let filtered;
    if (options.requireSearchTerm) {
      filtered = searchTerm ? alerts.filter((a) => a.id.toLowerCase().includes(searchTerm)) : [];
    } else {
      filtered = searchTerm ? alerts.filter((a) => a.id.toLowerCase().includes(searchTerm)) : alerts;
    }

    alertsTableBody.innerHTML = "";

    if (filtered.length === 0) {
      alertsTable.classList.add("hidden");
      emptyState.classList.add("visible");
      if (options.requireSearchTerm) {
        emptyState.querySelector("p").textContent = searchTerm
          ? `No alerts found matching Alert ID "${searchInput.value.trim()}".`
          : "Start typing an Alert ID above to find a matching alert.";
      } else if (searchTerm) {
        emptyState.querySelector("p").innerHTML = `No alerts found matching Alert ID "${searchInput.value.trim()}".`;
      }
    } else {
      alertsTable.classList.remove("hidden");
      emptyState.classList.remove("visible");
      filtered.forEach((alert) => {
        const row = document.createElement("tr");
        row.innerHTML = buildRowHtml(alert);
        alertsTableBody.appendChild(row);
      });
    }

    renderStats();
  }

  // Update status directly from the table (event delegation, since rows are dynamic)
  alertsTableBody.addEventListener("change", function (e) {
    if (e.target.classList.contains("status-select")) {
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      const alerts = getAlerts();
      const alert = alerts.find((a) => a.id === id);
      if (alert) {
        alert.status = newStatus;
        saveAlerts(alerts);
        renderStats();
        showPageMessage(`Status for "${id}" updated to "${newStatus}".`);
      }
    }
  });

  // Delete an alert directly from the table
  alertsTableBody.addEventListener("click", function (e) {
    const deleteBtn = e.target.closest(".delete-btn");
    if (!deleteBtn) return;
    const id = deleteBtn.dataset.id;
    const confirmed = confirm(`Delete alert "${id}"? This cannot be undone.`);
    if (confirmed) {
      let alerts = getAlerts();
      alerts = alerts.filter((a) => a.id !== id);
      saveAlerts(alerts);
      render();
      showPageMessage(`Alert "${id}" deleted.`);
    }
  });

  if (searchInput) searchInput.addEventListener("input", render);
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", function () {
      searchInput.value = "";
      render();
      searchInput.focus();
    });
  }

  render();
}

// view.html has no #searchInput -> shows everything.
// search.html has #searchInput -> only shows results once the user types.
wireTablePage({ requireSearchTerm: !!document.getElementById("searchInput") && window.location.pathname.includes("search") });
import { mockData } from "./state.js";
import { apiEndpoints, apiRequest, getApiBaseUrl } from "./api.js";
import { renderSimpleList, escapeHtml } from "./ui.js";
import { normalizeDonations } from "./donations.js";
import { normalizeVolunteers } from "./volunteers.js";

const dashboardPanels = {
  kpis: {
    target: "kpiGrid",
    label: "KPIs",
    empty: "No KPI data is available yet.",
  },
  attendanceTrend: {
    target: "attendanceSparkline",
    label: "attendance trend",
    empty: "No attendance has been recorded yet.",
  },
  upcomingEvents: {
    target: "upcomingEvents",
    label: "upcoming events",
    empty: "No upcoming events are scheduled.",
  },
  donations: {
    target: "recentDonations",
    label: "recent donations",
    empty: "No donations have been recorded yet.",
  },
  careAlerts: {
    target: "careAlerts",
    label: "care alerts",
    empty: "No care alerts need attention.",
  },
  volunteers: {
    target: "dashboardVolunteers",
    label: "volunteer requests",
    empty: "No volunteer requests or updates are available.",
  },
};

// Dashboard snapshots are separate from editable feature state, so a failed
// refresh can retain the last successful result without changing other views.
const dashboardResources = Object.fromEntries(
  Object.keys(dashboardPanels).map((key) => [
    key,
    {
      data: structuredClone(mockData[key]),
      phase: "idle",
      source: "mock",
      version: 0,
      base: "",
      updatedAt: null,
      error: "",
    },
  ]),
);

export function isDashboardResource(key) {
  return Object.hasOwn(dashboardPanels, key);
}

function normalizeDashboardData(key, payload) {
  if (!Array.isArray(payload)) throw new Error("Invalid API response");
  if (key === "attendanceTrend") {
    if (
      payload.some(
        (value) =>
          typeof value !== "number" || !Number.isFinite(value) || value < 0,
      )
    ) {
      throw new Error("Invalid attendance data");
    }
    return payload;
  }
  if (
    payload.some(
      (value) => !value || typeof value !== "object" || Array.isArray(value),
    )
  ) {
    throw new Error("Invalid API response");
  }
  if (key === "donations") return normalizeDonations(payload);
  if (key === "volunteers") return normalizeVolunteers(payload);
  return payload;
}

function renderDashboardPanel(key) {
  const { target, label, empty } = dashboardPanels[key];
  const state = dashboardResources[key];
  const root = document.getElementById(target);
  const status = document.getElementById(`${target}Status`);
  root.setAttribute("aria-busy", String(state.phase === "loading"));
  status.dataset.state = state.phase;
  let message = "";
  if (state.phase === "idle" || state.phase === "loading") {
    message = `Loading ${label}...`;
  } else if (state.phase === "error") {
    message = state.error;
    if (state.source === "api") message += " Showing the last loaded data.";
    else if (state.data.length) message += " Showing existing sample data.";
  } else if (state.phase === "unavailable") {
    message = `${label[0].toUpperCase()}${label.slice(1)} is not available from the API yet.`;
    if (state.data.length) message += " Showing existing sample data.";
  } else if (!state.data.length) {
    message = empty;
  }
  status.textContent = message;
  status.hidden = !message;
  status.setAttribute("role", state.phase === "error" ? "alert" : "status");
  const retry = document.querySelector(`[data-dashboard-retry="${key}"]`);
  retry.hidden = !["error", "unavailable"].includes(state.phase);

  renderDashboardPanelContent(key, root, state.data);
}

function renderDashboardPanelContent(key, root, records) {
  const target = root.id;
  if (key === "kpis") {
    root.innerHTML = records
      .map(
        (kpi) =>
          `<article class="kpi"><p>${escapeHtml(kpi.label ?? "")}</p><h3>${escapeHtml(kpi.value ?? "")}</h3></article>`,
      )
      .join("");
  } else if (key === "attendanceTrend") {
    const points = records.slice(-12);
    // Preserve the existing chart for 0–100 values; scale larger attendance
    // counts proportionally rather than flattening them all at 100%.
    const maximum = Math.max(100, ...points);
    root.style.gridTemplateColumns = `repeat(${Math.max(1, points.length)}, 1fr)`;
    root.setAttribute(
      "aria-label",
      points.length
        ? `Weekly attendance, oldest to newest: ${points.join(", ")}.`
        : "No attendance data available.",
    );
    root.innerHTML = points
      .map(
        (point, index) =>
          `<div style="height:${(point / maximum) * 100}%;" title="Week ${index + 1}: ${point}" aria-hidden="true"></div>`,
      )
      .join("");
    document.getElementById("attendanceRangeLabel").textContent = points.length
      ? `Last ${points.length} ${points.length === 1 ? "Week" : "Weeks"}`
      : "Last 12 Weeks";
  } else if (key === "upcomingEvents") {
    renderSimpleList(
      target,
      records,
      (event) =>
        `<li><strong>${escapeHtml(event.name ?? "")}</strong><br/><small>${escapeHtml(event.date ?? "")} - ${escapeHtml(event.seats ?? "")} seats</small></li>`,
    );
  } else if (key === "careAlerts") {
    renderSimpleList(
      target,
      records,
      (alert) =>
        `<article><strong>${escapeHtml(alert.title ?? "")}</strong><p>${escapeHtml(alert.text ?? "")}</p></article>`,
    );
  } else if (key === "donations") {
    // Dates are free-text labels in the existing API. IDs identify the latest
    // recorded donations without inventing years for labels such as "Feb 9".
    const recentDonations = [...records]
      .sort(
        (first, second) => (Number(second.id) || 0) - (Number(first.id) || 0),
      )
      .slice(0, 5);
    renderSimpleList(
      target,
      recentDonations,
      (entry) =>
        `<li><strong>${escapeHtml(entry.donor ?? "")}</strong> — ${escapeHtml(entry.amount ?? "")}<br/><small>${escapeHtml(entry.fund ?? "")}${entry.date ? ` · ${escapeHtml(entry.date ?? "")}` : ""}</small></li>`,
    );
  } else if (key === "volunteers") {
    renderSimpleList(
      target,
      records,
      (entry) => `<li>${escapeHtml(entry.message ?? "")}</li>`,
    );
  }
}

function updateDashboardStatus() {
  const states = Object.values(dashboardResources);
  const loading = states.some((state) =>
    ["idle", "loading"].includes(state.phase),
  );
  const incomplete = states.some((state) =>
    ["error", "unavailable"].includes(state.phase),
  );
  const button = document.getElementById("dashboardRefreshBtn");
  button.disabled = loading;
  button.classList.toggle("is-loading", loading);
  button.textContent = loading ? "Refreshing..." : "Refresh Dashboard";
  const status = document.getElementById("dashboardStatus");
  status.textContent = loading
    ? "Loading dashboard information..."
    : incomplete
      ? "Some dashboard information is unavailable. Retry the affected panels or refresh the dashboard."
      : "Dashboard is up to date.";
  // Only claim a full update when every panel completed successfully.
  const times = states.map((state) => state.updatedAt);
  if (!loading && !incomplete && times.every(Boolean)) {
    status.textContent += ` Last updated ${new Date(Math.min(...times)).toLocaleTimeString()}.`;
  }
}

export async function loadDashboardResource(key) {
  const state = dashboardResources[key];
  const version = ++state.version;
  const base = getApiBaseUrl();
  if (state.base !== base) {
    state.data = structuredClone(mockData[key]);
    state.source = "mock";
    state.updatedAt = null;
    state.base = base;
  }
  state.phase = "loading";
  renderDashboardPanel(key);
  updateDashboardStatus();
  try {
    if (!apiEndpoints[key]) throw new Error("Endpoint unavailable");
    const payload = await apiRequest(apiEndpoints[key]);
    if (payload === undefined) throw new Error("Session expired");
    const data = normalizeDashboardData(key, payload);
    if (version === state.version) {
      state.data = data;
      state.source = "api";
      state.phase = "ready";
      state.updatedAt = Date.now();
    }
    return data;
  } catch (error) {
    if (version === state.version) {
      if (
        ["HTTP 404", "HTTP 501", "Endpoint unavailable"].includes(error.message)
      ) {
        state.phase = "unavailable";
        state.data = structuredClone(mockData[key]);
        state.source = "mock";
        state.updatedAt = null;
      } else {
        state.phase = "error";
        state.error =
          error.message === "Session expired"
            ? "Your session expired. Please sign in again."
            : error.message === "HTTP 403"
              ? `You do not have permission to view ${dashboardPanels[key].label}.`
              : `Could not load ${dashboardPanels[key].label}. Please try again.`;
        if (["Session expired", "HTTP 403"].includes(error.message)) {
          state.data = [];
          state.source = "mock";
          state.updatedAt = null;
        }
      }
    }
    throw error;
  } finally {
    if (version === state.version) {
      renderDashboardPanel(key);
      updateDashboardStatus();
    }
  }
}

export async function refreshDashboard() {
  return Promise.allSettled(
    Object.keys(dashboardPanels).map(loadDashboardResource),
  );
}

export function setupDashboard() {
  document
    .getElementById("dashboardRefreshBtn")
    .addEventListener("click", refreshDashboard);
  document
    .querySelector('.menu-item[data-view="dashboard"]')
    .addEventListener("click", refreshDashboard);
  document
    .querySelector('.content-view[data-view="dashboard"]')
    .addEventListener("click", async (event) => {
      const button = event.target.closest("[data-dashboard-retry]");
      if (!button) return;
      try {
        await loadDashboardResource(button.dataset.dashboardRetry);
        const heading =
          button.closest(".panel")?.querySelector("h2") ||
          document.getElementById("viewTitle");
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      } catch {
        /* The panel displays the error. */
      }
    });
}

export function renderDashboard() {
  Object.keys(dashboardPanels).forEach(renderDashboardPanel);
  updateDashboardStatus();
}

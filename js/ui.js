import { showToast, getRequestErrorMessage } from "./feedback.js";
import { appData, resourceStatus } from "./state.js";
import { getApiBaseUrl, setApiBaseUrl } from "./api.js";

const viewMetadata = {
  dashboard: ["Dashboard", "Overview of church health and ministry activity"],
  members: ["Members", "Directory, journey tracking, and care visibility"],
  attendance: ["Attendance", "Service check-ins and participation metrics"],
  events: ["Events", "Planning, registrations, and execution status"],
  donations: ["Donations", "Funds, giving records, and stewardship reporting"],
  volunteers: ["Volunteers", "Scheduling, staffing health, and role gaps"],
  communication: [
    "Communication",
    "Campaigns, audience segments, and delivery",
  ],
  reports: ["Reports", "Board-level insight across core ministry pillars"],
  settings: ["Settings", "Church profile and system configuration"],
};

const menuItems = [...document.querySelectorAll(".menu-item")];
const contentViews = [...document.querySelectorAll(".content-view")];
const viewTitle = document.getElementById("viewTitle");
const viewSubtitle = document.getElementById("viewSubtitle");
const sidebar = document.getElementById("sidebar");
const dataSourceBadge = document.getElementById("dataSourceBadge");
const apiStatusText = document.getElementById("apiStatusText");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const syncNowBtn = document.getElementById("syncNowBtn");
const addRecordBtn = document.getElementById("addRecordBtn");

export function setApiStatus(message) {
  if (apiStatusText) {
    apiStatusText.textContent = message;
  }
}

export function setDataBadge(mode, label) {
  if (!dataSourceBadge) {
    return;
  }
  dataSourceBadge.dataset.source = mode;
  dataSourceBadge.textContent = label;
}

export function formatRand(value) {
  const amount = Number(value) || 0;
  return `R${amount.toLocaleString("en-US")}`;
}

export function parseRand(raw) {
  if (raw == null) {
    return 0;
  }
  return Number(String(raw).replace(/[^0-9.-]/g, "")) || 0;
}

export function setView(targetView) {
  menuItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === targetView);
    if (item.dataset.view === targetView)
      item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  contentViews.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === targetView);
  });

  const [title, subtitle] = viewMetadata[targetView];
  viewTitle.textContent = title;
  viewSubtitle.textContent = subtitle;
  setNavigationOpen(false);
  viewTitle.focus({ preventScroll: true });
}

const collectionResources = {
  memberTableBody: [
    "members",
    "No members yet. Add the first member using the form above.",
  ],
  donationTableBody: [
    "donations",
    "No donations yet. Record a donation using the form above.",
  ],
  volunteerList: [
    "volunteers",
    "No volunteer updates yet. Add an update above.",
  ],
  communicationCards: [
    "communication",
    "No communications yet. Create one using the form above.",
  ],
  attendanceCards: ["attendance", "No attendance records are available yet."],
  reportCards: ["reports", "No reports are available yet."],
  fundProgress: ["funds", "No funds are available yet."],
};

export function renderCollection(targetId, records, templateFn, emptyMessage) {
  const root = document.getElementById(targetId);
  const [resourceKey, defaultEmpty] = collectionResources[targetId];
  const state = resourceStatus[resourceKey];
  const loading = ["idle", "loading"].includes(state.phase);
  root.setAttribute("aria-busy", String(loading));
  let status = document.getElementById(`${targetId}State`);
  if (!status) {
    status = document.createElement("p");
    status.id = `${targetId}State`;
    status.className = "collection-status";
    status.setAttribute("role", "status");
    (root.closest(".table-wrap") || root).before(status);
  }
  status.textContent = loading
    ? "Loading records..."
    : state.phase === "error"
      ? `Could not refresh this information. ${records.length ? "Showing previously loaded records. " : ""}Use Sync Now in Settings to retry.`
      : "";
  status.classList.toggle("is-loading", loading);
  status.hidden = !status.textContent;
  const message = loading
    ? "Loading records..."
    : state.phase === "error"
      ? "Records are currently unavailable. Please try syncing again."
      : emptyMessage || defaultEmpty;
  root.innerHTML = records.length
    ? records.map(templateFn).join("")
    : root.tagName === "TBODY"
      ? `<tr class="empty-row"><td colspan="${root.closest("table").querySelectorAll("thead th").length}">${escapeHtml(message)}</td></tr>`
      : root.tagName === "UL"
        ? `<li class="empty-state">${escapeHtml(message)}</li>`
        : `<p class="empty-state">${escapeHtml(message)}</p>`;
  enhanceRecordActions(root);
}

function enhanceRecordActions(root) {
  root.querySelectorAll("button[data-action]").forEach((button) => {
    const container = button.closest("tr,article,li");
    const name = container?.querySelector("td,strong")?.textContent || "record";
    button.setAttribute("aria-label", `${button.textContent.trim()} ${name}`);
    const form = root.closest(".content-view")?.querySelector("form");
    button.disabled =
      !button.dataset.id || form?.getAttribute("aria-busy") === "true";
  });
}

export function renderSimpleList(targetId, records, templateFn) {
  if (collectionResources[targetId])
    return renderCollection(targetId, records, templateFn);
  const root = document.getElementById(targetId);
  root.innerHTML = records.map(templateFn).join("");
  enhanceRecordActions(root);
}

export function setupGlobalSearch() {
  const globalSearch = document.getElementById("globalSearch");

  globalSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const term = globalSearch.value.trim().toLowerCase();
    if (!term) {
      setView("dashboard");
      return;
    }

    const matchingMember = appData.members.find((entry) =>
      entry.name.toLowerCase().includes(term),
    );
    if (matchingMember) {
      setView("members");
      document.getElementById("memberSearch").value = term;
      document.getElementById("memberSearch").dispatchEvent(new Event("input"));
      return;
    }

    const matchingEvent = appData.events.find((entry) =>
      entry.name.toLowerCase().includes(term),
    );
    if (matchingEvent) {
      setView("events");
      return;
    }

    setView("dashboard");
    showToast("No members or events matched your search.", "warning");
  });
}

function isMobileNavigation() {
  return window.innerWidth <= 980;
}

function setNavigationOpen(open, restoreFocus = false) {
  const toggle = document.getElementById("menuToggle");
  sidebar.classList.toggle("show", open);
  toggle.setAttribute("aria-expanded", String(open));
  sidebar.inert = isMobileNavigation() && !open;
  if (open) sidebar.querySelector(".menu-item.active")?.focus();
  else if (restoreFocus) toggle.focus();
}

export function setupNavigation() {
  menuItems.forEach((item) => {
    item.setAttribute("aria-controls", `view-${item.dataset.view}`);
    if (item.classList.contains("active"))
      item.setAttribute("aria-current", "page");
    item.addEventListener("click", () => setView(item.dataset.view));
  });
  contentViews.forEach((view) => {
    view.id = `view-${view.dataset.view}`;
    view.setAttribute("aria-label", viewMetadata[view.dataset.view][0]);
  });
  const toggle = document.getElementById("menuToggle");
  toggle.setAttribute("aria-controls", "sidebar");
  setNavigationOpen(false);
  toggle.addEventListener("click", () =>
    setNavigationOpen(!sidebar.classList.contains("show")),
  );
  document.addEventListener("keydown", (event) => {
    if (!isMobileNavigation() || !sidebar.classList.contains("show")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setNavigationOpen(false, true);
    }
    if (event.key === "Tab") {
      const buttons = [
        ...sidebar.querySelectorAll("button:not([disabled]),a[href]"),
      ];
      const first = buttons[0],
        last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener("click", (event) => {
    if (
      isMobileNavigation() &&
      sidebar.classList.contains("show") &&
      !sidebar.contains(event.target) &&
      !toggle.contains(event.target)
    )
      setNavigationOpen(false);
  });
  window.addEventListener("resize", () => {
    if (!isMobileNavigation()) setNavigationOpen(false);
    else sidebar.inert = !sidebar.classList.contains("show");
  });
}

export function setupSettingsActions(syncDataFromApi) {
  if (!apiBaseUrlInput || !saveSettingsBtn || !syncNowBtn) {
    return;
  }

  apiBaseUrlInput.value = getApiBaseUrl();

  saveSettingsBtn.addEventListener("click", () => {
    const nextUrl = apiBaseUrlInput.value.trim();
    try {
      const url = new URL(nextUrl);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error();
    } catch {
      apiBaseUrlInput.setAttribute("aria-invalid", "true");
      setApiStatus(
        "Enter a valid HTTP or HTTPS API base URL without credentials, query parameters, or a fragment.",
      );
      apiBaseUrlInput.focus();
      return;
    }
    try {
      setApiBaseUrl(nextUrl);
      apiBaseUrlInput.removeAttribute("aria-invalid");
      setApiStatus(`Saved API base URL: ${getApiBaseUrl()}`);
      showToast("API settings saved.");
    } catch (error) {
      showToast("Settings could not be saved in this browser.", "error");
    }
  });

  syncNowBtn.addEventListener("click", async () => {
    setApiStatus("Syncing with API...");
    try {
      const result = await syncDataFromApi();
      showToast(
        result?.failedKeys.length
          ? "Some information could not be refreshed. Please try again."
          : "All information is up to date.",
        result?.failedKeys.length ? "warning" : "success",
      );
    } catch (error) {
      showToast(getRequestErrorMessage(error), "error");
    }
  });
}

const firstRecordInputByView = {
  members: "memberName",
  events: "eventName",
  donations: "donationDonor",
  volunteers: "volunteerMessage",
  communication: "communicationChannel",
};

export function setupAddRecordShortcut() {
  addRecordBtn?.addEventListener("click", () => {
    const currentView =
      document.querySelector(".menu-item.active")?.dataset.view;
    const inputId = firstRecordInputByView[currentView];
    if (inputId) {
      document.getElementById(inputId)?.focus();
      return;
    }
    setView("members");
    document.getElementById("memberName")?.focus();
  });
}

export function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = String(value);
  return element.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

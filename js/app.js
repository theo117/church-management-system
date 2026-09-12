import {
  showToast,
  getRequestErrorMessage,
  setFormFeedback,
} from "./feedback.js";
import { requireAuth } from "./auth.js";
import { clearInputValidation } from "./forms.js";
import { apiEndpoints, apiRequest, getApiBaseUrl } from "./api.js";
import {
  appData,
  mockData,
  resetAppData,
  normalizeArray,
  resourceStatus,
} from "./state.js";
import {
  setDataBadge,
  setApiStatus,
  setupNavigation,
  setupGlobalSearch,
  setupSettingsActions,
  setupAddRecordShortcut,
} from "./ui.js";
import {
  renderDashboard,
  setupDashboard,
  isDashboardResource,
  loadDashboardResource,
} from "./dashboard.js";
import { renderAttendance } from "./attendance.js";
import { renderReports } from "./reports.js";
import {
  normalizeMembers,
  renderMembers,
  setupMemberForm,
  handleMemberAction,
  setupMemberFilters,
} from "./members.js";
import {
  loadEvents,
  renderEvents,
  setupEventForm,
  handleEventAction,
} from "./events.js";
import {
  renderDonations,
  setupDonationForm,
  handleDonationAction,
} from "./donations.js";
import {
  renderVolunteers,
  setupVolunteerForm,
  handleVolunteerAction,
} from "./volunteers.js";
import {
  normalizeCommunication,
  renderCommunication,
  setupCommunicationForm,
  handleCommunicationAction,
} from "./communications.js";

function normalizeResourceData(resourceKey, payload) {
  switch (resourceKey) {
    case "members":
      return normalizeMembers(payload);
    case "communication":
      return normalizeCommunication(payload);
    default:
      return normalizeArray(payload, mockData[resourceKey]);
  }
}

let activeSync = null;
let loadedApiBase = null;
function syncAppData() {
  if (!activeSync)
    activeSync = performSync().finally(() => {
      activeSync = null;
    });
  return activeSync;
}

async function performSync() {
  const apiBase = getApiBaseUrl();

  if (loadedApiBase !== apiBase) {
    resetAppData();
    loadedApiBase = apiBase;
  }

  const resourceKeys = Object.keys(apiEndpoints);

  resourceKeys.forEach((key) => {
    resourceStatus[key].phase = "loading";
  });
  document.getElementById("syncNowBtn").disabled = true;
  document.getElementById("syncNowBtn").classList.add("is-loading");
  renderAllViews();
  const results = await Promise.allSettled(
    resourceKeys.map(async (resourceKey) => {
      if (isDashboardResource(resourceKey))
        return [resourceKey, await loadDashboardResource(resourceKey)];

      if (resourceKey === "events") return [resourceKey, await loadEvents()];

      const payload = await apiRequest(apiEndpoints[resourceKey]);

      if (payload === undefined) throw new Error("Session expired");
      if (!Array.isArray(payload)) throw new Error("Invalid API response");
      return [resourceKey, normalizeResourceData(resourceKey, payload)];
    }),
  );

  let successCount = 0;

  const failedKeys = [];
  results.forEach((result, index) => {
    const key = resourceKeys[index];
    resourceStatus[key].phase =
      result.status === "fulfilled" ? "ready" : "error";
    if (result.status === "rejected") failedKeys.push(key);
    if (result.status === "fulfilled") {
      const [resourceKey, payload] = result.value;
      // Events publishes its own latest response and retains data on failed loads.
      if (resourceKey !== "events") appData[resourceKey] = payload;
      successCount += 1;
    }
  });

  if (successCount === resourceKeys.length) {
    setDataBadge("api", "Data: API");
    setApiStatus(`Connected to API: ${apiBase}`);
  } else if (successCount > 0) {
    setDataBadge(
      "mixed",
      `Data: Mixed (${successCount}/${resourceKeys.length})`,
    );
    setApiStatus(
      `Partial API sync from ${apiBase}. Some information could not be refreshed.`,
    );
  } else {
    setDataBadge("mock", "Data: Mock");
    setApiStatus(
      `API unreachable at ${apiBase}. Previously loaded information may be out of date.`,
    );
  }

  renderAllViews();
  document.getElementById("syncNowBtn").disabled = false;
  document.getElementById("syncNowBtn").classList.remove("is-loading");
  return { failedKeys };
}

function renderAllViews() {
  renderDashboard();
  renderMembers();
  renderAttendance();
  renderEvents();
  renderDonations();
  renderVolunteers();
  renderCommunication();
  renderReports();
}

async function refreshAfterMutation() {
  if (activeSync) await activeSync;
  return syncAppData();
}

function setupFeatureForms() {
  setupMemberForm(refreshAfterMutation);
  setupEventForm();
  setupDonationForm(refreshAfterMutation);
  setupVolunteerForm(refreshAfterMutation);
  setupCommunicationForm(refreshAfterMutation);

  const actionHandlers = {
    member: handleMemberAction,
    event: handleEventAction,
    donation: handleDonationAction,
    volunteer: handleVolunteerAction,
    communication: handleCommunicationAction,
  };

  document.body.addEventListener("click", async (event) => {
    const target = event.target.closest?.("button[data-action]");
    if (!target || target.disabled) return;
    const form = target.closest(".content-view")?.querySelector("form");
    if (form?.getAttribute("aria-busy") === "true") return;
    const { action, id } = target.dataset;
    const handler = actionHandlers[action?.split("-")[1]];
    if (handler) {
      try {
        await handler(action, id, refreshAfterMutation);
        if (action.startsWith("edit-")) {
          if (form) clearInputValidation(form);
          form
            ?.querySelector("input:not([type=hidden]),select,textarea")
            ?.focus();
          if (form && action !== "edit-event")
            setFormFeedback(
              form,
              "Editing this record. Save your changes or select Cancel.",
            );
        }
      } catch (error) {
        showToast(getRequestErrorMessage(error), "error");
      }
    }
  });
}

async function initializeApp() {
  if (!requireAuth()) return;
  setupNavigation();
  setDataBadge("mock", "Data: Mock");
  renderAllViews();
  setupDashboard();
  setupMemberFilters();
  setupGlobalSearch();
  setupFeatureForms();
  setupSettingsActions(syncAppData);
  setupAddRecordShortcut();
  setApiStatus("Syncing with API...");
  await syncAppData();
}

initializeApp();

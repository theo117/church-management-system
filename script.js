console.log("script.js loaded");



if (!localStorage.getItem("cms_jwt")) {
    window.location.href = "login.html";
}









const mockData = {
  kpis: [],
  attendanceTrend: [],
  upcomingEvents: [],
  careAlerts: [],
  members: [],
  attendance: [],
  events: [],
  donations: [],
  funds: [],
  volunteers: [],
  communication: [],
  reports: []
};

const DEFAULT_API_BASE = "https://church.teodordev.co.za/api";
const API_STORAGE_KEY = "cms_api_base_url";

const apiEndpoints = {
  kpis: "/dashboard/kpis",
  attendanceTrend: "/dashboard/attendance-trend",
  upcomingEvents: "/events/upcoming",
  careAlerts: "/care/alerts",
  members: "/members",
  attendance: "/attendance/services",
  events: "/events",
  donations: "/donations",
  funds: "/funds",
  volunteers: "/volunteers",
  communication: "/communications",
  reports: "/reports"
};

const viewMeta = {
  dashboard: ["Dashboard", "Overview of church health and ministry activity"],
  members: ["Members", "Directory, journey tracking, and care visibility"],
  attendance: ["Attendance", "Service check-ins and participation metrics"],
  events: ["Events", "Planning, registrations, and execution status"],
  donations: ["Donations", "Funds, giving records, and stewardship reporting"],
  volunteers: ["Volunteers", "Scheduling, staffing health, and role gaps"],
  communication: ["Communication", "Campaigns, audience segments, and delivery"],
  reports: ["Reports", "Board-level insight across core ministry pillars"],
  settings: ["Settings", "Church profile and system configuration"]
};

let appData = structuredClone(mockData);

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

function getApiBaseUrl() {
  return (localStorage.getItem(API_STORAGE_KEY) || DEFAULT_API_BASE).replace(/\/$/, "");
}

function setApiBaseUrl(url) {
  localStorage.setItem(API_STORAGE_KEY, url.replace(/\/$/, ""));
}

function setApiStatus(message) {
  if (apiStatusText) {
    apiStatusText.textContent = message;
  }
}

function setDataBadge(mode, label) {
  if (!dataSourceBadge) {
    return;
  }
  dataSourceBadge.dataset.source = mode;
  dataSourceBadge.textContent = label;
}

function formatRand(value) {
  const amount = Number(value) || 0;
  return `R${amount.toLocaleString("en-US")}`;
}

function parseRand(raw) {
  if (raw == null) {
    return 0;
  }
  return Number(String(raw).replace(/[^0-9.-]/g, "")) || 0;
}

function setView(targetView) {
  menuItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === targetView);
  });

  contentViews.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === targetView);
  });

  const [title, subtitle] = viewMeta[targetView];
  viewTitle.textContent = title;
  viewSubtitle.textContent = subtitle;
  sidebar.classList.remove("show");
}

menuItems.forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

document.getElementById("menuToggle").addEventListener("click", () => {
  sidebar.classList.toggle("show");
});

function normalizeArray(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeMembers(payload) {
  return normalizeArray(payload, mockData.members).map((item) => ({
    id: item.id ?? null,
    name: item.name || "Unknown",
    status: item.status || "active",
    ministry: item.ministry || "N/A",
    group: item.group || "N/A",
    lastAttended: item.lastAttended || item.last_attended || "N/A"
  }));
}

function normalizeEvents(payload) {
  return normalizeArray(payload, mockData.events).map((item) => ({
    id: item.id ?? null,
    name: item.name || "Untitled",
    owner: item.owner || "N/A",
    progress: Number(item.progress) || 0,
    eventDate: item.eventDate || "",
    seatsTaken: Number(item.seatsTaken) || 0,
    seatsTotal: Number(item.seatsTotal) || 0,
    upcoming: Boolean(item.upcoming)
  }));
}

function normalizeDonations(payload) {
  return normalizeArray(payload, mockData.donations).map((item) => {
    const amountValue = item.amountValue != null ? Number(item.amountValue) : parseRand(item.amount);
    return {
      id: item.id ?? null,
      donor: item.donor || "Unknown",
      fund: item.fund || "General",
      amount: item.amount || formatRand(amountValue),
      amountValue,
      date: item.date || ""
    };
  });
}

function normalizeVolunteers(payload) {
  return normalizeArray(payload, mockData.volunteers).map((item) => ({
    id: item.id ?? null,
    message: item.message || ""
  }));
}

function normalizeCommunication(payload) {
  return normalizeArray(payload, mockData.communication).map((item) => ({
    id: item.id ?? null,
    channel: item.channel || "",
    audience: item.audience || "",
    status: item.status || ""
  }));
}

function normalizeRecord(key, payload) {
  switch (key) {
    case "members":
      return normalizeMembers(payload);
    case "events":
      return normalizeEvents(payload);
    case "donations":
      return normalizeDonations(payload);
    case "volunteers":
      return normalizeVolunteers(payload);
    case "communication":
      return normalizeCommunication(payload);
    case "attendanceTrend":
      return normalizeArray(payload, mockData.attendanceTrend).map((v) => Number(v) || 0);
    default:
      return normalizeArray(payload, mockData[key]);
  }
}

async function apiRequest(endpoint, options = {}) {

    const token = localStorage.getItem("cms_jwt");

    const apiBase = getApiBaseUrl();

const response = await fetch(`${apiBase}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        localStorage.removeItem("cms_jwt");
        window.location.href = "login.html";
        return;
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}


async function syncDataFromApi() {
    console.log("syncDataFromApi() started");

    const apiBase = getApiBaseUrl();
    console.log("API Base:", apiBase);

    appData = structuredClone(mockData);
    

  const keys = Object.keys(apiEndpoints);
  const results = await Promise.allSettled(
    keys.map(async (key) => {
      keys.map(async (key) => {
    console.log("Requesting:", key, apiEndpoints[key]);

    const payload = await apiRequest(apiEndpoints[key]);

    return [key, normalizeRecord(key, payload)];
})
      const payload = await apiRequest(apiEndpoints[key]);
      return [key, normalizeRecord(key, payload)];
    })
  );

  let successCount = 0;

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      const [key, payload] = result.value;
      appData[key] = payload;
      successCount += 1;
    }
  });

  if (successCount === keys.length) {
    setDataBadge("api", "Data: API");
    setApiStatus(`Connected to API: ${apiBase}`);
  } else if (successCount > 0) {
    setDataBadge("mixed", `Data: Mixed (${successCount}/${keys.length})`);
    setApiStatus(`Partial API sync from ${apiBase}. Some modules are using mock data.`);
  } else {
    setDataBadge("mock", "Data: Mock");
    setApiStatus(`API unreachable at ${apiBase}. Mock data is active.`);
  }

  renderAll();
}

function renderKpis() {
  const root = document.getElementById("kpiGrid");
  root.innerHTML = appData.kpis
    .map((kpi) => `<article class="kpi"><p>${kpi.label}</p><h3>${kpi.value}</h3></article>`)
    .join("");
}

function renderAttendanceSparkline() {
  const root = document.getElementById("attendanceSparkline");
  root.innerHTML = appData.attendanceTrend
    .map((point) => `<div style="height:${Math.max(0, Math.min(100, point))}%;"></div>`)
    .join("");
}

function renderSimpleList(targetId, records, templateFn) {
  const root = document.getElementById(targetId);
  root.innerHTML = records.map(templateFn).join("");
}

function renderMembers(filtered = appData.members) {
  const root = document.getElementById("memberTableBody");
  root.innerHTML = filtered
    .map((member) => `
      <tr>
        <td>${member.name}</td>
        <td>${member.status}</td>
        <td>${member.ministry}</td>
        <td>${member.group}</td>
        <td>${member.lastAttended}</td>
        <td>
          <button class="action-btn" data-action="edit-member" data-id="${member.id ?? ""}">Edit</button>
          <button class="action-btn delete" data-action="delete-member" data-id="${member.id ?? ""}">Delete</button>
        </td>
      </tr>`)
    .join("");
}

function renderFundProgress() {
  const root = document.getElementById("fundProgress");
  root.innerHTML = appData.funds
    .map((fund) => {
      const raised = Number(fund.raised) || 0;
      const goal = Number(fund.goal) || 1;
      const percent = Math.round((raised / goal) * 100);
      return `
        <div class="fund-row">
          <div class="meta">
            <strong>${fund.name}</strong>
          </div>
          <div class="bar"><span style="width:${Math.min(percent, 100)}%;"></span></div>
        </div>`;
    })
    .join("");
}

function renderAll() {
  renderKpis();
  renderAttendanceSparkline();

  renderSimpleList(
    "upcomingEvents",
    appData.upcomingEvents,
    (event) => `<li><strong>${event.name}</strong><br/><small>${event.date} - ${event.seats} seats</small></li>`
  );

  renderSimpleList(
    "careAlerts",
    appData.careAlerts,
    (alert) => `<article><strong>${alert.title}</strong><p>${alert.text}</p></article>`
  );

  renderMembers();

  renderSimpleList(
    "attendanceCards",
    appData.attendance,
    (entry) => `<article><strong>${entry.service}</strong><p>${entry.checkedIn} checked in</p><p>${entry.volunteers} volunteers on duty</p></article>`
  );

  renderSimpleList(
    "eventCards",
    appData.events,
    (entry) => `
      <article>
        <strong>${entry.name}</strong>
        <p>Owner: ${entry.owner}</p>
        <div class="bar"><span style="width:${entry.progress}%"></span></div>
        <p>${entry.eventDate || ""} ${entry.seatsTotal ? `| ${entry.seatsTaken}/${entry.seatsTotal} seats` : ""}</p>
        <button class="action-btn" data-action="edit-event" data-id="${entry.id ?? ""}">Edit</button>
        <button class="action-btn delete" data-action="delete-event" data-id="${entry.id ?? ""}">Delete</button>
      </article>`
  );

  renderFundProgress();

  renderSimpleList(
    "donationTableBody",
    appData.donations,
    (entry) => `<tr>
      <td>${entry.donor}</td>
      <td>${entry.fund}</td>
      <td>${entry.amount}</td>
      <td>${entry.date}</td>
      <td>
        <button class="action-btn" data-action="edit-donation" data-id="${entry.id ?? ""}">Edit</button>
        <button class="action-btn delete" data-action="delete-donation" data-id="${entry.id ?? ""}">Delete</button>
      </td>
    </tr>`
  );

  renderSimpleList(
    "volunteerList",
    appData.volunteers,
    (entry) => `<li>${entry.message}
      <br/>
      <button class="action-btn" data-action="edit-volunteer" data-id="${entry.id ?? ""}">Edit</button>
      <button class="action-btn delete" data-action="delete-volunteer" data-id="${entry.id ?? ""}">Delete</button>
    </li>`
  );

  renderSimpleList(
    "communicationCards",
    appData.communication,
    (entry) => `<article>
      <strong>${entry.channel}</strong>
      <p>${entry.audience}</p>
      <p>Status: ${entry.status}</p>
      <button class="action-btn" data-action="edit-communication" data-id="${entry.id ?? ""}">Edit</button>
      <button class="action-btn delete" data-action="delete-communication" data-id="${entry.id ?? ""}">Delete</button>
    </article>`
  );

  renderSimpleList(
    "reportCards",
    appData.reports,
    (entry) => `<article><strong>${entry.title}</strong><p>${entry.value}</p></article>`
  );
}

function setupMemberFilters() {
  const searchInput = document.getElementById("memberSearch");
  const statusFilter = document.getElementById("memberStatusFilter");

  function applyFilter() {
    const term = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;

    const filtered = appData.members.filter((member) => {
      const text = `${member.name} ${member.status} ${member.ministry} ${member.group}`.toLowerCase();
      const matchesTerm = !term || text.includes(term);
      const matchesStatus = status === "all" || member.status === status;
      return matchesTerm && matchesStatus;
    });

    renderMembers(filtered);
  }

  searchInput.addEventListener("input", applyFilter);
  statusFilter.addEventListener("change", applyFilter);
}

function setupGlobalSearch() {
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

    const memberHit = appData.members.find((entry) => entry.name.toLowerCase().includes(term));
    if (memberHit) {
      setView("members");
      document.getElementById("memberSearch").value = term;
      document.getElementById("memberSearch").dispatchEvent(new Event("input"));
      return;
    }

    const eventHit = appData.events.find((entry) => entry.name.toLowerCase().includes(term));
    if (eventHit) {
      setView("events");
      return;
    }

    setView("dashboard");
  });
}

function resetMemberForm() {
  document.getElementById("memberForm").reset();
  document.getElementById("memberId").value = "";
}

function resetEventForm() {
  document.getElementById("eventForm").reset();
  document.getElementById("eventId").value = "";
}

function resetDonationForm() {
  document.getElementById("donationForm").reset();
  document.getElementById("donationId").value = "";
}

function resetVolunteerForm() {
  document.getElementById("volunteerForm").reset();
  document.getElementById("volunteerId").value = "";
}

function resetCommunicationForm() {
  document.getElementById("communicationForm").reset();
  document.getElementById("communicationId").value = "";
}

function setupCrudForms() {
  document.getElementById("memberForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("memberId").value;
    const payload = {
      name: document.getElementById("memberName").value,
      status: document.getElementById("memberStatus").value,
      ministry: document.getElementById("memberMinistry").value,
      group: document.getElementById("memberGroup").value,
      lastAttended: document.getElementById("memberLastAttended").value
    };
    await apiRequest(id ? `/members/${id}` : "/members", id ? "PUT" : "POST", payload);
    resetMemberForm();
    await syncDataFromApi();
  });

  document.getElementById("eventForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("eventId").value;
    const payload = {
      name: document.getElementById("eventName").value,
      owner: document.getElementById("eventOwner").value,
      progress: Number(document.getElementById("eventProgress").value),
      eventDate: document.getElementById("eventDate").value,
      seatsTaken: Number(document.getElementById("eventSeatsTaken").value),
      seatsTotal: Number(document.getElementById("eventSeatsTotal").value),
      upcoming: document.getElementById("eventUpcoming").checked
    };
    await apiRequest(id ? `/events/${id}` : "/events", id ? "PUT" : "POST", payload);
    resetEventForm();
    await syncDataFromApi();
  });

  document.getElementById("donationForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("donationId").value;
    const payload = {
      donor: document.getElementById("donationDonor").value,
      fund: document.getElementById("donationFund").value,
      amount: Number(document.getElementById("donationAmount").value),
      date: document.getElementById("donationDate").value
    };
    await apiRequest(id ? `/donations/${id}` : "/donations", id ? "PUT" : "POST", payload);
    resetDonationForm();
    await syncDataFromApi();
  });

  document.getElementById("volunteerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("volunteerId").value;
    const payload = {
      message: document.getElementById("volunteerMessage").value
    };
    await apiRequest(id ? `/volunteers/${id}` : "/volunteers", id ? "PUT" : "POST", payload);
    resetVolunteerForm();
    await syncDataFromApi();
  });

  document.getElementById("communicationForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = document.getElementById("communicationId").value;
    const payload = {
      channel: document.getElementById("communicationChannel").value,
      audience: document.getElementById("communicationAudience").value,
      status: document.getElementById("communicationStatus").value
    };
    await apiRequest(id ? `/communications/${id}` : "/communications", id ? "PUT" : "POST", payload);
    resetCommunicationForm();
    await syncDataFromApi();
  });

  document.getElementById("memberCancelBtn").addEventListener("click", resetMemberForm);
  document.getElementById("eventCancelBtn").addEventListener("click", resetEventForm);
  document.getElementById("donationCancelBtn").addEventListener("click", resetDonationForm);
  document.getElementById("volunteerCancelBtn").addEventListener("click", resetVolunteerForm);
  document.getElementById("communicationCancelBtn").addEventListener("click", resetCommunicationForm);

  document.body.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === "edit-member") {
      const record = appData.members.find((m) => String(m.id) === id);
      if (!record) return;
      document.getElementById("memberId").value = record.id;
      document.getElementById("memberName").value = record.name;
      document.getElementById("memberStatus").value = record.status;
      document.getElementById("memberMinistry").value = record.ministry;
      document.getElementById("memberGroup").value = record.group;
      document.getElementById("memberLastAttended").value = record.lastAttended;
      setView("members");
    }

    if (action === "delete-member" && id) {
      if (!confirm("Delete this member?")) return;
      await apiRequest(`/members/${id}`, "DELETE");
      await syncDataFromApi();
    }

    if (action === "edit-event") {
      const record = appData.events.find((e) => String(e.id) === id);
      if (!record) return;
      document.getElementById("eventId").value = record.id;
      document.getElementById("eventName").value = record.name;
      document.getElementById("eventOwner").value = record.owner;
      document.getElementById("eventProgress").value = record.progress;
      document.getElementById("eventDate").value = record.eventDate || "";
      document.getElementById("eventSeatsTaken").value = record.seatsTaken || 0;
      document.getElementById("eventSeatsTotal").value = record.seatsTotal || 0;
      document.getElementById("eventUpcoming").checked = Boolean(record.upcoming);
      setView("events");
    }

    if (action === "delete-event" && id) {
      if (!confirm("Delete this event?")) return;
      await apiRequest(`/events/${id}`, "DELETE");
      await syncDataFromApi();
    }

    if (action === "edit-donation") {
      const record = appData.donations.find((d) => String(d.id) === id);
      if (!record) return;
      document.getElementById("donationId").value = record.id;
      document.getElementById("donationDonor").value = record.donor;
      document.getElementById("donationFund").value = record.fund;
      document.getElementById("donationAmount").value = record.amountValue;
      document.getElementById("donationDate").value = record.date;
      setView("donations");
    }

    if (action === "delete-donation" && id) {
      if (!confirm("Delete this donation?")) return;
      await apiRequest(`/donations/${id}`, "DELETE");
      await syncDataFromApi();
    }

    if (action === "edit-volunteer") {
      const record = appData.volunteers.find((v) => String(v.id) === id);
      if (!record) return;
      document.getElementById("volunteerId").value = record.id;
      document.getElementById("volunteerMessage").value = record.message;
      setView("volunteers");
    }

    if (action === "delete-volunteer" && id) {
      if (!confirm("Delete this volunteer update?")) return;
      await apiRequest(`/volunteers/${id}`, "DELETE");
      await syncDataFromApi();
    }

    if (action === "edit-communication") {
      const record = appData.communication.find((c) => String(c.id) === id);
      if (!record) return;
      document.getElementById("communicationId").value = record.id;
      document.getElementById("communicationChannel").value = record.channel;
      document.getElementById("communicationAudience").value = record.audience;
      document.getElementById("communicationStatus").value = record.status;
      setView("communication");
    }

    if (action === "delete-communication" && id) {
      if (!confirm("Delete this communication item?")) return;
      await apiRequest(`/communications/${id}`, "DELETE");
      await syncDataFromApi();
    }
  });
}

function setupSettingsActions() {
  if (!apiBaseUrlInput || !saveSettingsBtn || !syncNowBtn) {
    return;
  }

  apiBaseUrlInput.value = getApiBaseUrl();

  saveSettingsBtn.addEventListener("click", () => {
    const nextUrl = apiBaseUrlInput.value.trim();
    if (!nextUrl) {
      setApiStatus("Please enter a valid API base URL.");
      return;
    }

    setApiBaseUrl(nextUrl);
    setApiStatus(`Saved API base URL: ${getApiBaseUrl()}`);
  });

  syncNowBtn.addEventListener("click", async () => {
    setApiStatus("Syncing with API...");
    await syncDataFromApi();
  });
}

function setupAddRecordShortcut() {
  addRecordBtn?.addEventListener("click", () => {
    const current = document.querySelector(".menu-item.active")?.dataset.view;
    if (current === "members") {
      document.getElementById("memberName")?.focus();
      return;
    }
    if (current === "events") {
      document.getElementById("eventName")?.focus();
      return;
    }
    if (current === "donations") {
      document.getElementById("donationDonor")?.focus();
      return;
    }
    if (current === "volunteers") {
      document.getElementById("volunteerMessage")?.focus();
      return;
    }
    if (current === "communication") {
      document.getElementById("communicationChannel")?.focus();
      return;
    }
    setView("members");
    document.getElementById("memberName")?.focus();
  });
}

async function init() {
  setDataBadge("mock", "Data: Mock");
  renderAll();
  setupMemberFilters();
  setupGlobalSearch();
  setupCrudForms();
  setupSettingsActions();
  setupAddRecordShortcut();
  setApiStatus("Syncing with API...");
  await syncDataFromApi();
}

init();

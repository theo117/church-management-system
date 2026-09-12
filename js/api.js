import { getToken, logout } from "./auth.js";

const DEFAULT_API_BASE = "https://church.teodordev.co.za/api";
const API_STORAGE_KEY = "cms_api_base_url";

export const apiEndpoints = {
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
  reports: "/reports",
};

export function getApiBaseUrl() {
  return (localStorage.getItem(API_STORAGE_KEY) || DEFAULT_API_BASE).replace(
    /\/$/,
    "",
  );
}

export function setApiBaseUrl(url) {
  localStorage.setItem(API_STORAGE_KEY, url.replace(/\/$/, ""));
}

async function requestJson(
  url,
  options,
  { token, onUnauthorized, ignoreResponseBody = false } = {},
) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal.reason);
  if (options.signal?.aborted) abortFromCaller();
  else
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
      return;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (response.status === 204 || ignoreResponseBody) {
      return null;
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}

export async function apiRequest(endpoint, options = {}, responseOptions = {}) {
  return requestJson(`${getApiBaseUrl()}${endpoint}`, options, {
    token: getToken(),
    onUnauthorized: logout,
    ignoreResponseBody: responseOptions.ignoreResponseBody,
  });
}

export async function requestLogin(credentials) {
  // Login has always used the default API, independently of saved settings.
  // A rejected login stays on the form; authenticated requests log out on 401.
  return requestJson(`${DEFAULT_API_BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function saveRecord(endpoint, recordId, payload) {
  const response = await apiRequest(
    recordId ? `${endpoint}/${recordId}` : endpoint,
    {
      method: recordId ? "PUT" : "POST",
      body: JSON.stringify(payload),
    },
  );
  if (response === undefined) throw new Error("Session expired");
  return response;
}

export async function deleteRecord(
  endpoint,
  recordId,
  responseOptions = { ignoreResponseBody: true },
) {
  const response = await apiRequest(
    `${endpoint}/${recordId}`,
    { method: "DELETE" },
    responseOptions,
  );
  if (response === undefined) throw new Error("Session expired");
  return response;
}

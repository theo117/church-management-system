// Shared data; imports observe the latest state after each sync.

export const mockData = {
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
  reports: [],
};

export let appData = structuredClone(mockData);

export function resetAppData() {
  appData = structuredClone(mockData);
}

export function normalizeArray(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

// Request state is separate from records so failed refreshes can retain data.
export const resourceStatus = Object.fromEntries(
  Object.keys(mockData).map((key) => [key, { phase: "idle", error: "" }]),
);

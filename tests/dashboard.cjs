const { JSDOM, VirtualConsole } = require("jsdom");
const { createModuleLoader, nextTurn } = require("./helpers.cjs");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
process.chdir(path.resolve(__dirname, ".."));
const tick = nextTurn;

(async () => {
  const dom = new JSDOM(fs.readFileSync("index.html", "utf8"), {
    url: "https://cms.test/index.html",
    runScripts: "outside-only",
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window,
    d = w.document;
  w.structuredClone = structuredClone;
  w.localStorage.setItem("cms_jwt", "test-token");
  const fixtures = {
    "/dashboard/kpis": [
      { label: "Active Members", value: "245" },
      { label: "Monthly Giving", value: "R12,500" },
    ],
    "/dashboard/attendance-trend": [50, 100, 200, 400],
    "/events/upcoming": [
      { name: "Sunday Lunch", date: "Sep 20", seats: "10/40" },
    ],
    "/care/alerts": [{ title: "Follow up", text: "Visit requested" }],
    "/donations": Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      donor: `Donor ${i + 1}`,
      fund: "General",
      amount: "R1,200",
      date: "Feb 9",
    })),
    "/volunteers": [{ id: 1, message: "Worship Team: 5 positions unfilled." }],
  };
  const failures = {},
    requests = [];
  let gate = null;
  w.fetch = async (url, options = {}) => {
    const endpoint = new URL(url).pathname.replace(/^\/api/, "");
    requests.push(endpoint);
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const data = structuredClone(fixtures[endpoint]);
    if (gate && gate.endpoint === endpoint) {
      const pending = gate;
      gate = null;
      await pending.promise;
    }
    const code = failures[endpoint];
    if (code === "network") throw new Error("offline");
    return {
      status: typeof code === "number" ? code : 200,
      ok: typeof code !== "number" || code < 400,
      json: async () => (code === "malformed" ? {} : data),
    };
  };
  const { modules, loadModule } = createModuleLoader(dom);
  const dashboard = (await loadModule("js/dashboard.js")).namespace;
  const state = modules.get(path.resolve("js/state.js")).namespace;
  const api = modules.get(path.resolve("js/api.js")).namespace;
  const el = (id) => d.getElementById(id);
  const unchanged = d.querySelector(
    '.content-view[data-view="members"]',
  ).outerHTML;
  const originalDonations = JSON.stringify(state.appData.donations);
  dashboard.setupDashboard();
  dashboard.renderDashboard();
  assert.match(el("dashboardStatus").textContent, /Loading/);
  let release;
  gate = {
    endpoint: "/care/alerts",
    promise: new Promise((resolve) => {
      release = resolve;
    }),
  };
  const initial = dashboard.refreshDashboard();
  await tick();
  assert.equal(el("careAlerts").getAttribute("aria-busy"), "true");
  assert.match(el("kpiGrid").textContent, /245/);
  assert.equal(el("kpiGridStatus").hidden, true);
  assert.equal(el("dashboardRefreshBtn").disabled, true);
  release();
  await initial;
  assert.deepEqual([...requests].sort(), Object.keys(fixtures).sort());
  assert.match(el("dashboardStatus").textContent, /up to date.*Last updated/);
  assert.equal(el("dashboardRefreshBtn").disabled, false);
  assert.equal(el("kpiGrid").children.length, 2);
  assert.match(el("upcomingEvents").textContent, /Sunday Lunch/);
  assert.match(el("careAlerts").textContent, /Visit requested/);
  assert.match(el("dashboardVolunteers").textContent, /5 positions/);
  assert.equal(el("recentDonations").children.length, 5);
  assert.match(
    el("recentDonations").firstElementChild.textContent,
    /Donor 7.*R1,200/,
  );
  assert.doesNotMatch(el("recentDonations").textContent, /Donor 1/);
  const bars = [...el("attendanceSparkline").children];
  assert.deepEqual(
    bars.map((bar) => bar.style.height),
    ["12.5%", "25%", "50%", "100%"],
  );
  assert.match(
    el("attendanceSparkline").getAttribute("aria-label"),
    /50, 100, 200, 400/,
  );
  console.log(
    "PASS six API panels, independent loading, recent donations, proportional attendance chart",
  );

  fixtures["/dashboard/attendance-trend"] = Array.from(
    { length: 15 },
    (_, i) => i,
  );
  await dashboard.loadDashboardResource("attendanceTrend");
  assert.equal(el("attendanceSparkline").children.length, 12);
  assert.equal(el("attendanceSparkline").firstElementChild.title, "Week 1: 3");
  fixtures["/dashboard/attendance-trend"] = [0, 0];
  await dashboard.loadDashboardResource("attendanceTrend");
  assert.equal(el("attendanceSparkline").firstElementChild.style.height, "0%");
  fixtures["/dashboard/kpis"] = [
    { label: "<img src=x onerror=bad()>", value: "<script>bad()</script>" },
  ];
  await dashboard.loadDashboardResource("kpis");
  assert.equal(el("kpiGrid").querySelector("img,script"), null);
  assert.match(el("kpiGrid").textContent, /<img/);
  console.log("PASS last 12 attendance points, zero counts, safe API text");

  failures["/care/alerts"] = "network";
  await dashboard.refreshDashboard();
  assert.match(
    el("careAlertsStatus").textContent,
    /Could not load.*last loaded/,
  );
  assert.equal(el("careAlertsStatus").getAttribute("role"), "alert");
  assert.match(el("careAlerts").textContent, /Visit requested/);
  assert.equal(
    d.querySelector('[data-dashboard-retry="careAlerts"]').hidden,
    false,
  );
  assert.match(el("dashboardStatus").textContent, /unavailable/);
  delete failures["/care/alerts"];
  const count = requests.length;
  d.querySelector('[data-dashboard-retry="careAlerts"]').click();
  await tick();
  await tick();
  assert.equal(requests.length, count + 1);
  assert.equal(el("careAlertsStatus").hidden, true);
  assert.equal(
    d.querySelector('[data-dashboard-retry="careAlerts"]').hidden,
    true,
  );
  for (const endpoint of Object.keys(fixtures)) failures[endpoint] = "network";
  await dashboard.refreshDashboard();
  assert.equal(el("dashboardRefreshBtn").disabled, false);
  for (const key of Object.keys(failures)) delete failures[key];
  console.log("PASS partial/total failures, last loaded data, per-panel retry");

  state.mockData.careAlerts.push({
    title: "Existing sample",
    text: "Keep this fallback",
  });
  failures["/care/alerts"] = 404;
  await assert.rejects(dashboard.loadDashboardResource("careAlerts"));
  assert.match(el("careAlerts").textContent, /Existing sample/);
  assert.match(el("careAlertsStatus").textContent, /not available.*sample/);
  delete failures["/care/alerts"];
  fixtures["/care/alerts"] = [];
  await dashboard.loadDashboardResource("careAlerts");
  assert.equal(el("careAlerts").children.length, 0);
  assert.match(el("careAlertsStatus").textContent, /No care alerts/);
  state.mockData.volunteers.push({
    id: 2,
    message: "Existing volunteer sample",
  });
  const endpoint = api.apiEndpoints.volunteers;
  delete api.apiEndpoints.volunteers;
  const beforeMissing = requests.length;
  await assert.rejects(dashboard.loadDashboardResource("volunteers"));
  assert.equal(requests.length, beforeMissing);
  assert.match(
    el("dashboardVolunteers").textContent,
    /Existing volunteer sample/,
  );
  api.apiEndpoints.volunteers = endpoint;
  console.log(
    "PASS missing endpoint preserves existing mocks; empty API response replaces them",
  );

  failures["/dashboard/kpis"] = "malformed";
  await assert.rejects(dashboard.loadDashboardResource("kpis"));
  assert.match(el("kpiGridStatus").textContent, /Could not load/);
  delete failures["/dashboard/kpis"];
  failures["/volunteers"] = 403;
  await assert.rejects(dashboard.loadDashboardResource("volunteers"));
  assert.match(el("dashboardVolunteersStatus").textContent, /permission/);
  assert.equal(el("dashboardVolunteers").children.length, 0);
  delete failures["/volunteers"];
  fixtures["/dashboard/kpis"] = [{ label: "Members", value: "Old" }];
  gate = {
    endpoint: "/dashboard/kpis",
    promise: new Promise((resolve) => {
      release = resolve;
    }),
  };
  const old = dashboard.loadDashboardResource("kpis");
  fixtures["/dashboard/kpis"] = [{ label: "Members", value: "Newest" }];
  await dashboard.loadDashboardResource("kpis");
  release();
  await old;
  assert.match(el("kpiGrid").textContent, /Newest/);
  w.localStorage.setItem("cms_api_base_url", "https://different.test/api");
  failures["/dashboard/kpis"] = "network";
  await assert.rejects(dashboard.loadDashboardResource("kpis"));
  assert.doesNotMatch(el("kpiGrid").textContent, /Newest/);
  delete failures["/dashboard/kpis"];
  console.log(
    "PASS invalid responses, permissions, stale requests, API base changes",
  );

  for (const endpoint of Object.keys(fixtures)) fixtures[endpoint] = [];
  await dashboard.refreshDashboard();
  for (const id of [
    "kpiGrid",
    "attendanceSparkline",
    "upcomingEvents",
    "careAlerts",
    "recentDonations",
    "dashboardVolunteers",
  ]) {
    assert.equal(el(id).children.length, 0);
    assert.equal(el(id + "Status").hidden, false);
    assert.match(el(id + "Status").textContent, /No /);
  }
  const navCount = requests.length;
  d.querySelector('.menu-item[data-view="dashboard"]').click();
  await tick();
  await tick();
  assert.equal(requests.length, navCount + 6);
  el("dashboardRefreshBtn").click();
  await tick();
  await tick();
  assert.equal(requests.length, navCount + 12);
  failures["/dashboard/kpis"] = 401;
  await assert.rejects(dashboard.loadDashboardResource("kpis"));
  assert.match(el("kpiGridStatus").textContent, /session expired/);
  assert.equal(w.localStorage.getItem("cms_jwt"), null);
  assert.equal(
    d.querySelector('.content-view[data-view="members"]').outerHTML,
    unchanged,
  );
  assert.equal(JSON.stringify(state.appData.donations), originalDonations);
  dom.window.close();
  console.log(
    "PASS six empty states, manual/navigation refresh, authentication, other features untouched",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

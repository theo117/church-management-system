const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createModuleLoader, nextTurn } = require("./helpers.cjs");
process.chdir(path.resolve(__dirname, ".."));

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
  let confirmDelete = true,
    heldRequest = null;
  w.confirm = () => confirmDelete;
  const records = {
    "/dashboard/kpis": [{ label: "Members", value: "2" }],
    "/dashboard/attendance-trend": [120, 160],
    "/events/upcoming": [{ name: "Sunday", date: "Sep 20", seats: "10/40" }],
    "/care/alerts": [],
    "/members": [
      {
        id: 1,
        name: "Zoe",
        email: "zoe@example.com",
        status: "active",
        ministry: "Choir",
        smallGroup: "North",
        lastAttended: "Sep 12",
      },
      {
        id: 2,
        name: "Alice",
        email: "alice@example.com",
        status: "inactive",
        ministry: "Welcome",
        smallGroup: "South",
        lastAttended: "Sep 10",
      },
    ],
    "/attendance/services": [],
    "/events": [
      {
        id: 1,
        name: "Picnic",
        owner: "Outreach",
        progress: 25,
        eventDate: "Sep 20",
        seatsTaken: 1,
        seatsTotal: 10,
        upcoming: true,
      },
    ],
    "/donations": [
      { id: 1, donor: "Zoe", fund: "General", amount: "R50", date: "Sep 12" },
      {
        id: 2,
        donor: "Alice",
        fund: "Missions",
        amount: "R10",
        date: "Sep 10",
      },
    ],
    "/funds": [],
    "/volunteers": [{ id: 1, message: "Help needed" }],
    "/communications": [
      { id: 1, channel: "Email", audience: "All", status: "Draft" },
    ],
    "/reports": [],
  };
  const failures = new Map(),
    requests = [],
    errors = [];
  const catchRejection = (error) => errors.push(error.message);
  process.on("unhandledRejection", catchRejection);
  w.fetch = async (url, options = {}) => {
    const endpoint = new URL(url).pathname.replace(/^\/api/, "");
    const method = options.method || "GET";
    const resource = endpoint.replace(/\/\d+$/, "");
    requests.push({ endpoint, method, body: options.body });
    if (heldRequest?.method === method) {
      const pending = heldRequest;
      heldRequest = null;
      await pending.promise;
    }
    if (failures.has(`${method} ${resource}`))
      return { status: failures.get(`${method} ${resource}`), ok: false };
    if (method === "GET")
      return {
        status: 200,
        ok: true,
        json: async () => structuredClone(records[endpoint] || []),
      };
    const id = Number(endpoint.split("/").at(-1));
    if (method === "POST")
      records[resource].push({
        id: Math.max(0, ...records[resource].map((record) => record.id)) + 1,
        ...JSON.parse(options.body),
      });
    if (method === "PUT")
      records[resource] = records[resource].map((record) =>
        record.id === id ? { id, ...JSON.parse(options.body) } : record,
      );
    if (method === "DELETE")
      records[resource] = records[resource].filter(
        (record) => record.id !== id,
      );
    return {
      status: 200,
      ok: true,
      json: async () => {
        if (method === "DELETE") throw new SyntaxError("Empty response");
        return {};
      },
    };
  };
  const el = (id) => d.getElementById(id);
  const settle = async () => {
    await nextTurn();
    await nextTurn();
  };
  const click = async (selector) => {
    const button = d.querySelector(selector);
    assert.ok(button, selector);
    button.click();
    await settle();
  };
  const submit = async (id) => {
    el(id).dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await settle();
  };
  const fill = (id, value) => {
    el(id).value = value;
    el(id).dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const { loadModule } = createModuleLoader(dom);
  await loadModule("js/app.js");
  await settle();
  assert.equal(requests.length, 12);
  assert.match(el("memberTableBody").textContent, /Zoe/);
  assert.match(el("attendanceCards").textContent, /No attendance/);
  assert.match(el("reportCards").textContent, /No reports/);
  assert.equal(el("syncNowBtn").disabled, false);
  assert.equal(el("memberName").getAttribute("aria-label"), "Full name");
  console.log(
    "PASS startup, independent data, empty states, accessible form names",
  );

  await click('.menu-item[data-view="members"]');
  assert.equal(d.activeElement.id, "viewTitle");
  assert.equal(
    d
      .querySelector('.menu-item[data-view="members"]')
      .getAttribute("aria-current"),
    "page",
  );
  await click("#memberTable th:first-child button");
  assert.equal(
    el("memberTableBody").firstElementChild.cells[0].textContent,
    "Alice",
  );
  assert.equal(
    d.querySelector("#memberTable th").getAttribute("aria-sort"),
    "ascending",
  );
  fill("memberSearch", "choir");
  assert.equal(el("memberResultCount").textContent, "1 of 2 members");
  await click("#syncNowBtn");
  assert.equal(el("memberResultCount").textContent, "1 of 2 members");
  fill("memberSearch", "nobody");
  assert.match(el("memberTableBody").textContent, /No members match/);
  fill("memberSearch", "");
  await click('[data-action="edit-member"][data-id="1"]');
  assert.equal(el("memberEmail").value, "zoe@example.com");
  assert.equal(el("memberGroup").value, "North");
  assert.equal(d.activeElement.id, "memberName");
  fill("memberName", " ");
  const count = requests.length;
  await submit("memberForm");
  assert.equal(requests.length, count);
  assert.equal(el("memberName").getAttribute("aria-invalid"), "true");
  assert.equal(d.activeElement.id, "memberName");
  fill("memberName", "Zoe Updated");
  fill("memberEmail", "bad");
  await submit("memberForm");
  assert.equal(requests.length, count);
  fill("memberEmail", "zoe@example.com");
  await submit("memberForm");
  assert.equal(records["/members"][0].name, "Zoe Updated");
  assert.match(el("memberFormFeedback").textContent, /Member updated/);
  assert.match(el("toastRegion").textContent, /Member updated/);
  assert.equal(el("memberId").value, "");
  console.log(
    "PASS table sorting/filter persistence, working member edit, validation, focus and success toast",
  );

  await click('.menu-item[data-view="donations"]');
  await click("#donationTable th:nth-child(3) button");
  assert.equal(
    el("donationTableBody").firstElementChild.cells[2].textContent,
    "R10",
  );
  fill("donationSearch", "missions");
  assert.equal(el("donationResultCount").textContent, "1 of 2 donations");
  fill("donationSearch", "");
  fill("donationDonor", "New Donor");
  fill("donationFund", "General");
  fill("donationDate", "Sep 12");
  fill("donationAmount", "-5");
  let before = requests.length;
  await submit("donationForm");
  assert.equal(requests.length, before);
  fill("donationAmount", "12.50");
  await submit("donationForm");
  assert.equal(records["/donations"].at(-1).amount, 12.5);
  await submit("donationForm");
  assert.equal(el("donationDonor").getAttribute("aria-invalid"), "true");
  await click('[data-action="edit-donation"][data-id="1"]');
  assert.equal(el("donationDonor").getAttribute("aria-invalid"), null);
  assert.equal(el("donationDonorError").textContent, "");
  assert.equal(el("donationAmount").value, "50");
  fill("donationAmount", "75.25");
  await submit("donationForm");
  assert.equal(records["/donations"][0].amount, 75.25);
  assert.match(el("donationFormFeedback").textContent, /Donation updated/);
  failures.set("DELETE /donations", 403);
  await click('[data-action="delete-donation"][data-id="1"]');
  assert.equal(records["/donations"].length, 3);
  assert.match(el("donationFormFeedback").textContent, /permission/);
  assert.equal(
    d.querySelector('[data-action="delete-donation"]').disabled,
    false,
  );
  failures.delete("DELETE /donations");
  await click('[data-action="delete-donation"][data-id="1"]');
  assert.equal(records["/donations"].length, 2);
  assert.equal(
    d.querySelector('[data-action="edit-donation"][data-id="1"]'),
    null,
  );
  assert.match(el("donationFormFeedback").textContent, /Donation deleted/);
  for (const [prefix, resource, fields] of [
    ["volunteer", "/volunteers", { volunteerMessage: "Welcome team needed" }],
    [
      "communication",
      "/communications",
      {
        communicationChannel: "SMS",
        communicationAudience: "All",
        communicationStatus: "Draft",
      },
    ],
  ]) {
    for (const [id, value] of Object.entries(fields)) fill(id, value);
    await submit(prefix + "Form");
    assert.equal(records[resource].length, 2);
    await click(`[data-action="edit-${prefix}"][data-id="1"]`);
    for (const [id, value] of Object.entries(fields))
      fill(id, value + " updated");
    await submit(prefix + "Form");
    confirmDelete = false;
    before = requests.length;
    await click(`[data-action="delete-${prefix}"][data-id="1"]`);
    assert.equal(requests.length, before);
    confirmDelete = true;
    await click(`[data-action="delete-${prefix}"][data-id="1"]`);
    assert.equal(records[resource].length, 1);
    assert.match(el(prefix + "FormFeedback").textContent, /deleted/);
  }
  console.log(
    "PASS donation cents and sorting, volunteer/communication create/edit/delete, confirmations",
  );

  fill("volunteerMessage", "Retain this draft");
  failures.set("POST /volunteers", 500);
  await submit("volunteerForm");
  assert.equal(el("volunteerMessage").value, "Retain this draft");
  assert.equal(el("volunteerSubmitBtn").disabled, false);
  assert.match(el("volunteerFormFeedback").textContent, /Could not save/);
  assert.ok(d.querySelector('.toast-error [role="alert"]'));
  failures.delete("POST /volunteers");
  let release;
  heldRequest = {
    method: "POST",
    promise: new Promise((resolve) => {
      release = resolve;
    }),
  };
  before = requests.length;
  await submit("volunteerForm");
  await submit("volunteerForm");
  assert.equal(requests.length, before + 1);
  assert.equal(el("volunteerSubmitBtn").disabled, true);
  assert.equal(el("volunteerSubmitBtn").classList.contains("is-loading"), true);
  assert.equal(
    d.querySelector('[data-action="edit-volunteer"]').disabled,
    true,
  );
  // A concurrent sync replaces the rows while the write remains pending.
  await click("#syncNowBtn");
  assert.equal(
    d.querySelector('[data-action="delete-volunteer"]').disabled,
    true,
  );
  release();
  await settle();
  assert.equal(el("volunteerSubmitBtn").disabled, false);
  assert.equal(
    d.querySelector('[data-action="edit-volunteer"]').disabled,
    false,
  );
  failures.set("GET /volunteers", 500);
  fill("volunteerMessage", "Saved but refresh fails");
  await submit("volunteerForm");
  assert.equal(el("volunteerMessage").value, "");
  assert.match(
    el("volunteerFormFeedback").textContent,
    /created.*could not be refreshed/,
  );
  assert.ok(d.querySelector(".toast-warning"));
  failures.delete("GET /volunteers");
  await click("#syncNowBtn");
  console.log(
    "PASS failed-write retention, pending spinner, duplicate prevention, failed-refresh distinction",
  );

  failures.set("GET /members", 503);
  await click("#syncNowBtn");
  assert.match(el("memberTableBodyState").textContent, /previously loaded/);
  assert.match(el("memberTableBody").textContent, /Zoe Updated/);
  failures.delete("GET /members");
  await click("#syncNowBtn");
  fill("apiBaseUrl", "javascript:alert(1)");
  await click("#saveSettingsBtn");
  assert.equal(w.localStorage.getItem("cms_api_base_url"), null);
  assert.equal(el("apiBaseUrl").getAttribute("aria-invalid"), "true");
  fill("apiBaseUrl", "https://alternate.test/api");
  await click("#saveSettingsBtn");
  assert.equal(
    w.localStorage.getItem("cms_api_base_url"),
    "https://alternate.test/api",
  );
  Object.defineProperty(w, "innerWidth", { value: 390, configurable: true });
  w.dispatchEvent(new w.Event("resize"));
  assert.equal(el("sidebar").inert, true);
  await click("#menuToggle");
  assert.equal(el("sidebar").inert, false);
  assert.equal(el("menuToggle").getAttribute("aria-expanded"), "true");
  d.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(el("menuToggle").getAttribute("aria-expanded"), "false");
  assert.equal(d.activeElement.id, "menuToggle");
  const dismiss = d.querySelector(".toast-error .toast-dismiss");
  dismiss.click();
  assert.equal(dismiss.isConnected, false);
  assert.deepEqual(errors, []);
  process.removeListener("unhandledRejection", catchRejection);
  dom.window.close();
  console.log(
    "PASS retained data on sync failure, API URL validation, mobile Escape/focus, dismissible toast, no uncaught errors",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

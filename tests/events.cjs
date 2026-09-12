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
  let records = [
    {
      id: 1,
      name: "Prayer Night",
      owner: "Pastoral Team",
      progress: 55,
      eventDate: "Feb 14",
      seatsTaken: 48,
      seatsTotal: 80,
      upcoming: true,
    },
    {
      id: 2,
      name: "<img src=x onerror=alert(1)>",
      owner: "<script>bad()</script>",
      progress: 0,
      eventDate: "Mar 1",
      seatsTaken: 0,
      seatsTotal: 0,
      upcoming: false,
    },
  ];
  let failure = null,
    hold = null,
    nextId = 3,
    confirmation = true;
  const requests = [],
    errors = [];
  const rejection = (error) => errors.push(error);
  process.on("unhandledRejection", rejection);
  w.confirm = () => confirmation;
  w.fetch = async (url, options = {}) => {
    const method = options.method || "GET";
    requests.push({ url, method, options });
    assert.equal(options.headers.Authorization, "Bearer test-token");
    if (hold) {
      const gate = hold;
      hold = null;
      await gate;
    }
    if (failure === method) throw new Error("offline");
    if (failure === "401") return { status: 401, ok: false };
    if (failure === "403") return { status: 403, ok: false };
    if (method === "GET")
      return {
        status: 200,
        ok: true,
        json: async () =>
          failure === "malformed" ? {} : structuredClone(records),
      };
    const id = Number(url.split("/").at(-1));
    if (method === "POST")
      records.push({ id: nextId++, ...JSON.parse(options.body) });
    if (method === "PUT")
      records = records.map((record) =>
        record.id === id ? { id, ...JSON.parse(options.body) } : record,
      );
    if (method === "DELETE")
      records = records.filter((record) => record.id !== id);
    // Spring's void DELETE returns 200 with an empty body, not JSON.
    return {
      status: 200,
      ok: true,
      json: async () => {
        if (method === "DELETE")
          throw new SyntaxError("Unexpected end of JSON input");
        return structuredClone(records.at(-1));
      },
    };
  };
  const { loadModule } = createModuleLoader(dom);
  const events = (await loadModule("js/events.js")).namespace;
  events.setupEventForm();
  const field = (id) => d.getElementById(id);
  const status = () => field("eventStatus").textContent;
  const submit = async () => {
    field("eventForm").dispatchEvent(
      new w.Event("submit", { cancelable: true }),
    );
    await tick();
    await tick();
  };
  const fill = (overrides = {}) => {
    const values = {
      eventName: " New Event ",
      eventOwner: " Ministry ",
      eventProgress: "25",
      eventDate: " Sep 15 ",
      eventSeatsTaken: "5",
      eventSeatsTotal: "10",
      ...overrides,
    };
    for (const [id, value] of Object.entries(values)) field(id).value = value;
  };
  const beforeMembers = field("memberForm").outerHTML;
  const firstLoad = events.loadEvents();
  assert.equal(status(), "Loading events...");
  assert.equal(field("eventSubmitBtn").disabled, true);
  await firstLoad;
  assert.equal(field("eventCards").children.length, 2);
  assert.equal(field("eventCards").querySelector("img,script"), null);
  assert.equal(field("eventSubmitBtn").disabled, false);
  console.log("PASS complete list, safe text rendering, loading state");

  for (const invalid of [
    { eventName: "  " },
    { eventOwner: " " },
    { eventDate: " " },
    { eventProgress: "101" },
    { eventProgress: "-1" },
    { eventProgress: "1.5" },
    { eventSeatsTaken: "-1" },
    { eventSeatsTotal: "1.5" },
    { eventSeatsTaken: "11" },
    { eventSeatsTotal: "2147483648" },
    { eventSeatsTaken: "" },
  ]) {
    fill(invalid);
    const count = requests.length;
    await submit();
    assert.equal(requests.length, count);
    assert.match(status(), /correct/);
  }
  console.log("PASS required fields, integer ranges, capacity validation");

  fill();
  await submit();
  assert.equal(records.length, 3);
  assert.equal(records.at(-1).name, "New Event");
  assert.equal(records.at(-1).eventDate, "Sep 15");
  assert.deepEqual(
    requests.slice(-2).map((r) => r.method),
    ["POST", "GET"],
  );
  assert.equal(field("eventName").value, "");
  assert.equal(field("eventCards").children.length, 3);
  assert.equal(status(), "Event created.");

  await events.handleEventAction("edit-event", "1");
  assert.equal(field("eventName").value, "Prayer Night");
  assert.equal(field("eventUpcoming").checked, true);
  fill({ eventName: "Updated Event" });
  await submit();
  assert.equal(records[0].name, "Updated Event");
  assert.deepEqual(
    requests.slice(-2).map((r) => r.method),
    ["PUT", "GET"],
  );
  assert.equal(field("eventId").value, "");
  await events.handleEventAction("edit-event", "1");
  field("eventCancelBtn").click();
  assert.equal(field("eventId").value, "");
  confirmation = false;
  const count = requests.length;
  await events.handleEventAction("delete-event", "1");
  assert.equal(requests.length, count);
  confirmation = true;
  await events.handleEventAction("edit-event", "1");
  await events.handleEventAction("delete-event", "1");
  assert.equal(records.length, 2);
  assert.equal(field("eventId").value, "");
  assert.equal(status(), "Event deleted.");
  assert.deepEqual(
    requests.slice(-2).map((r) => r.method),
    ["DELETE", "GET"],
  );
  console.log(
    "PASS create, edit, cancel, confirmed delete, empty 200 response, automatic refresh",
  );

  failure = "POST";
  fill();
  await submit();
  assert.match(status(), /Could not save/);
  assert.equal(field("eventName").value, " New Event ");
  assert.equal(field("eventSubmitBtn").disabled, false);
  failure = "DELETE";
  await events.handleEventAction("delete-event", "2");
  assert.match(status(), /Could not delete/);
  assert.equal(records.length, 2);
  failure = "GET";
  await assert.rejects(events.loadEvents());
  assert.match(status(), /Could not load/);
  assert.equal(field("eventCards").children.length, 2);
  failure = null;
  field("eventRefreshBtn").click();
  await tick();
  await tick();
  assert.match(status(), /events loaded/);
  failure = "malformed";
  await assert.rejects(events.loadEvents());
  assert.match(status(), /Could not load/);
  failure = "403";
  await events.handleEventAction("delete-event", "2");
  assert.match(status(), /permission/);
  failure = null;
  console.log("PASS errors, retained data, permission feedback, retry");

  failure = "GET";
  fill();
  await submit();
  assert.match(status(), /Event created.*could not be refreshed/);
  assert.equal(field("eventName").value, "");
  failure = null;
  await events.loadEvents();
  let release;
  hold = new Promise((resolve) => {
    release = resolve;
  });
  fill();
  const start = requests.length;
  await submit();
  await submit();
  assert.equal(requests.length, start + 1);
  assert.equal(field("eventSubmitBtn").disabled, true);
  release();
  await tick();
  await tick();
  assert.equal(field("eventSubmitBtn").disabled, false);
  console.log(
    "PASS failed refresh distinguished from failed write; duplicate submission blocked",
  );

  hold = new Promise((resolve) => {
    release = resolve;
  });
  const older = events.loadEvents();
  await events.loadEvents("Latest request");
  release();
  await older;
  assert.equal(status(), "Latest request");
  records = [];
  await events.loadEvents();
  assert.match(status(), /No events yet/);
  assert.equal(field("eventCards").children.length, 0);
  failure = "401";
  fill();
  await submit();
  assert.match(status(), /session expired/);
  assert.equal(w.localStorage.getItem("cms_jwt"), null);
  assert.equal(field("memberForm").outerHTML, beforeMembers);
  assert.equal(
    requests.every((r) => new URL(r.url).pathname.startsWith("/api/events")),
    true,
  );
  assert.deepEqual(errors, []);
  process.removeListener("unhandledRejection", rejection);
  dom.window.close();
  console.log(
    "PASS stale requests, empty list, expired session, Members untouched, no unhandled errors",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

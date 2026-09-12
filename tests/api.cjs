const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createModuleLoader, nextTurn } = require("./helpers.cjs");
process.chdir(path.resolve(__dirname, ".."));

(async () => {
  const browserLogs = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("log", (...values) => browserLogs.push(values));
  const dom = new JSDOM(fs.readFileSync("login.html", "utf8"), {
    url: "https://cms.test/login.html",
    runScripts: "outside-only",
    virtualConsole,
  });
  const { window } = dom;
  const { loadModule } = createModuleLoader(dom);
  const api = (await loadModule("js/api.js")).namespace;
  const auth = (await loadModule("js/auth.js")).namespace;
  const requests = [];
  let responseStatus = 200;
  let responseBody = { token: "new-test-token" };
  let bodyReads = 0;
  let rejectFetch = false;
  window.fetch = async (url, options) => {
    requests.push({ url, options });
    if (rejectFetch) throw new Error("offline");
    return {
      status: responseStatus,
      ok: responseStatus >= 200 && responseStatus < 300,
      json: async () => {
        bodyReads += 1;
        if (responseBody === "empty")
          throw new SyntaxError("Unexpected end of JSON input");
        return responseBody;
      },
    };
  };

  auth.saveToken("existing-token");
  api.setApiBaseUrl("https://alternate.test/api/");
  assert.equal(api.getApiBaseUrl(), "https://alternate.test/api");
  await api.apiRequest("/members", { headers: { "X-Test": "yes" } });
  assert.equal(requests.at(-1).url, "https://alternate.test/api/members");
  assert.deepEqual(
    JSON.parse(JSON.stringify(requests.at(-1).options.headers)),
    {
      "Content-Type": "application/json",
      Authorization: "Bearer existing-token",
      "X-Test": "yes",
    },
  );
  await api.apiRequest("/members", {
    headers: { Authorization: "custom-token" },
  });
  assert.equal(requests.at(-1).options.headers.Authorization, "custom-token");
  const payload = { name: "Choir", progress: 25 };
  await api.saveRecord("/events", "", payload);
  assert.equal(requests.at(-1).options.method, "POST");
  assert.equal(requests.at(-1).url, "https://alternate.test/api/events");
  assert.equal(requests.at(-1).options.body, JSON.stringify(payload));
  await api.saveRecord("/events", "12", payload);
  assert.equal(requests.at(-1).options.method, "PUT");
  assert.equal(requests.at(-1).url, "https://alternate.test/api/events/12");
  console.log(
    "PASS API base, headers, token overrides, create/update payloads",
  );

  responseStatus = 204;
  let previousReads = bodyReads;
  assert.equal(await api.apiRequest("/events/12", { method: "DELETE" }), null);
  assert.equal(bodyReads, previousReads);
  responseStatus = 200;
  responseBody = "empty";
  assert.equal(
    await api.deleteRecord("/events", "12", { ignoreResponseBody: true }),
    null,
  );
  assert.equal(requests.at(-1).options.method, "DELETE");
  assert.equal(bodyReads, previousReads);
  // All record deletes support the backend's empty response; JSON can still be required explicitly.
  await assert.rejects(
    api.deleteRecord("/members", "12", { ignoreResponseBody: false }),
    /Unexpected end/,
  );
  responseStatus = 403;
  previousReads = bodyReads;
  await assert.rejects(api.apiRequest("/events"), /HTTP 403/);
  assert.equal(bodyReads, previousReads);
  rejectFetch = true;
  await assert.rejects(api.apiRequest("/events"), /offline/);
  rejectFetch = false;
  responseStatus = 401;
  assert.equal(await api.apiRequest("/events"), undefined);
  assert.equal(auth.getToken(), null);
  console.log(
    "PASS 204, empty-body DELETE, JSON errors, HTTP/network failures, expired session",
  );

  auth.saveToken("stale-token");
  const credentials = { email: "test@example.com", password: "test-password" };
  await assert.rejects(api.requestLogin(credentials), /HTTP 401/);
  assert.equal(auth.getToken(), "stale-token");
  assert.equal(
    requests.at(-1).url,
    "https://church.teodordev.co.za/api/auth/login",
  );
  assert.equal(requests.at(-1).options.headers.Authorization, undefined);
  assert.equal(requests.at(-1).options.body, JSON.stringify(credentials));
  responseStatus = 200;
  responseBody = { token: "new-test-token" };
  await loadModule("login.js");
  const form = window.document.getElementById("loginForm");
  window.document.getElementById("email").value = credentials.email;
  window.document.getElementById("password").value = credentials.password;
  form.dispatchEvent(new window.Event("submit", { cancelable: true }));
  await nextTurn();
  assert.equal(auth.getToken(), "new-test-token");
  responseStatus = 401;
  form.dispatchEvent(new window.Event("submit", { cancelable: true }));
  await nextTurn();
  assert.equal(
    window.document.getElementById("loginError").textContent,
    "Invalid email or password.",
  );
  assert.equal(auth.getToken(), "new-test-token");
  assert.equal(browserLogs.length, 0);
  dom.window.close();
  console.log(
    "PASS login success/failure, existing URL policy, no authentication response logging",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

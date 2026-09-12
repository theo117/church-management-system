# Frontend verification

The suites run the real frontend modules in isolated DOMs with mocked API responses. They do not access a live backend.

Install the test-only DOM library outside the application (Node.js 24.15+):

```sh
npm install --prefix /tmp/cms-test-tools jsdom@30.0.1
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/frontend.cjs
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/events.cjs
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/dashboard.cjs
NODE_PATH=/tmp/cms-test-tools/node_modules node --experimental-vm-modules tests/api.cjs
```

- `frontend.cjs`: startup, accessible form names, table sorting/search, filter persistence, member editing, validation, donation cents, create/edit/delete, confirmation, busy controls, duplicate-submit prevention, success/error toasts, retained drafts and data, refresh failure feedback, settings URL validation, and mobile Escape/focus behavior.
- `events.cjs`: Events loading and CRUD, capacity validation, cancellation, response handling, failures/retry, duplicate submissions, and stale requests.
- `dashboard.cjs`: six API panels, attendance scaling, recent donations, loading/empty/error states, fallback data, retries, and navigation refresh.
- `api.cjs`: request headers and URLs, mutation payloads, empty delete responses, HTTP/network failures, authentication, and login success/failure.
- `helpers.cjs`: reusable isolated module loader.

`refactor-regression.cjs` remains a compatibility entry point for the frontend suite. The old exact-markup comparison was superseded by the explicitly requested UI enhancements.

Browser checks additionally cover desktop/mobile layout, keyboard focus, horizontal table scrolling, spinners, toast presentation, and native module loading using local API fixtures. Backend persistence and production authorization still belong to the existing server.

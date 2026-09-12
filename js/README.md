# Frontend modules

The frontend remains plain HTML, CSS, and JavaScript, with no build step or runtime dependencies. Serve the repository over HTTP(S), for example `python3 -m http.server 8000`, and open `http://localhost:8000`. Native ES modules require a web server rather than opening HTML with `file://`.

- `app.js`: entry point, API synchronization, normalization dispatch, rendering coordination, and delegated action routing.
- `api.js`: endpoint definitions, shared JSON transport, authentication policies, and `saveRecord`/`deleteRecord` request helpers. Login retains its fixed default URL; authenticated requests use the saved API base.
- `auth.js`: token storage, login guard, and logout; also imported by the existing `login.js`.
- `state.js`: shared data and empty fallback records. `resetAppData()` replaces state; ES module imports observe the current value.
- `dashboard.js`: six live dashboard panels, individual request states, retries, and refresh controls.
- `attendance.js`, `reports.js`: their respective view renderers.
- `members.js`, `events.js`, `donations.js`, `volunteers.js`, `communications.js`: feature normalization, rendering, forms, cancellation, editing, and deletion.
- `forms.js`: validation, accessible field errors, busy state, safe save/delete lifecycles, draft retention, and refresh feedback. Feature modules retain their explicit payload fields.
- `feedback.js`: dismissible toasts, persistent errors, request error messages, and form status/control helpers.
- `tables.js`: keyboard-operable column sorting; member and donation modules retain filtering and rendering.
- `ui.js`: navigation, shared rendering/formatting/HTML-escaping helpers, search, settings, and the add-record shortcut.

Feature form setup uses singular names (`setupMemberForm`, `setupDonationForm`, and so on). Action handlers receive the synchronization callback from `app.js`, avoiding circular imports. `syncAppData()` delegates dashboard and Events requests to their own loaders and normalizes the remaining resources. Events owns its list loading and refreshes only `/events` after mutations; `app.js` also delegates to that loader during a full sync. Its form validates required text, integer progress (0–100), and integer seat counts (0–2147483647, taken no greater than total). Dates remain free-text labels. Event loading and write errors appear in the section with a refresh action, and failed writes preserve form data. The shared delete helper accepts empty success responses from the backend; callers can explicitly request response parsing when needed. Initialization runs once through the module script in `index.html`. Keep page-wide event registration in setup functions.

Dashboard data uses the existing KPI, attendance-trend, upcoming-events, donations, care-alerts, and volunteers endpoints. Full application synchronization shares those requests with the dashboard loader, so initial loading does not duplicate API calls. Each panel renders as its request finishes. Dashboard navigation and the refresh button fetch just those six resources; retry fetches only the affected resource. Dashboard snapshots are separate from editable feature state.

Attendance displays the last 12 ordered values with proportional bar heights and an accessible text summary. Recent Donations shows the five newest recorded IDs, since the API's free-text dates do not reliably identify a year. Volunteer Requests displays the existing volunteer messages, including requests and updates. No new API endpoints or mock records were added.

Successful empty responses show an empty state. Network/server errors retain the last successful dashboard snapshot, clearly labelled as previously loaded data; changing the API base clears that snapshot. Missing endpoints (404/501 or no configured URL) retain the existing mock arrays and are labelled unavailable. Permission and session errors clear the affected panel. The current mock arrays are empty, so no sample data is invented.

## Interaction behavior

All record forms validate required text and native input constraints before sending requests. Field errors are announced and the first invalid control receives focus. Busy forms reject duplicate submissions. Successful changes refresh their lists and show inline feedback plus a toast; failed writes retain drafts, while a successful write followed by a failed refresh is reported separately. Events retains its capacity rules. Donations accept positive amounts with cents. Member editing now retains the API's email and smallGroup values.

JSON requests have a 15-second timeout and support caller cancellation. Record deletes accept the backend's empty success responses. Failed collection refreshes retain previously loaded data and provide retry guidance through Sync Now. The settings action validates HTTP(S) API URLs and only reports the API setting that it persists.

Row actions stay disabled during mutations, including when a concurrent refresh replaces the rows. Starting an edit clears validation errors from the previous draft.

Backend limitation: `DonationResponse.amount` is formatted to whole rand by `DashboardService.formatCurrency`. Donation submissions retain cents, but reloading a donation currently loses that precision in the response, including the amount used to populate the edit form. Exact editing requires the backend to return an unrounded amount; the frontend cannot reconstruct it from the rounded string.

Tables keep their existing HTML structure, with sortable header buttons, result counts, donation search, sticky headers, row focus/hover feedback, and keyboard-focusable scrolling regions. Member filters and sorting survive refreshes. Mobile navigation keeps collapsed links out of the tab order, traps focus while open, closes with Escape, and restores focus to the menu control. Focus outlines, skip navigation, reduced-motion styles, and screen-reader announcements use the existing branding and components.

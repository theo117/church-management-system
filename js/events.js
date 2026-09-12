import { showToast } from "./feedback.js";
import { appData } from "./state.js";
import { apiEndpoints, apiRequest, saveRecord, deleteRecord } from "./api.js";
import {
  resetRecordForm,
  clearInputValidation,
  enhanceForm,
  reportFormValidity,
} from "./forms.js";
import { setView, renderSimpleList, escapeHtml } from "./ui.js";

let isLoading = false;
let isSaving = false;
let latestLoadId = 0;

function normalizeEvents(payload) {
  return payload.map((item) => ({
    id: item.id ?? null,
    name: item.name || "Untitled",
    owner: item.owner || "N/A",
    progress: Number(item.progress) || 0,
    eventDate: item.eventDate || "",
    seatsTaken: Number(item.seatsTaken) || 0,
    seatsTotal: Number(item.seatsTotal) || 0,
    upcoming: Boolean(item.upcoming),
  }));
}

function setEventStatus(message, error = false) {
  const status = document.getElementById("eventStatus");
  status.textContent = message;
  status.dataset.state = error ? "error" : "status";
  status.setAttribute("role", error ? "alert" : "status");
}

function updateEventControls() {
  const busy = isLoading || isSaving;
  document.getElementById("eventForm").setAttribute("aria-busy", String(busy));
  document
    .getElementById("eventCards")
    .setAttribute("aria-busy", String(isLoading));
  document
    .querySelectorAll(
      "#eventForm input, #eventForm button, #eventCards button, #eventRefreshBtn",
    )
    .forEach((control) => {
      control.disabled =
        busy || (control.dataset.action && !control.dataset.id);
    });
  document
    .getElementById("eventSubmitBtn")
    .classList.toggle("is-loading", isSaving);
  document
    .getElementById("eventRefreshBtn")
    .classList.toggle("is-loading", isLoading);
  document
    .getElementById("eventStatus")
    .classList.toggle("is-loading", isLoading || isSaving);
  document.getElementById("eventSubmitBtn").textContent = isSaving
    ? "Saving..."
    : "Save Event";
}

export function renderEvents() {
  renderSimpleList(
    "eventCards",
    appData.events,
    (entry) => `
      <article>
        <strong>${escapeHtml(entry.name)}</strong>
        <p>Owner: ${escapeHtml(entry.owner)}</p>
        <div class="bar"><span style="width:${Math.max(0, Math.min(100, entry.progress))}%"></span></div>
        <p>${escapeHtml(entry.eventDate)} ${entry.seatsTotal ? `| ${entry.seatsTaken}/${entry.seatsTotal} seats` : ""}</p>
        <button class="action-btn" data-action="edit-event" data-id="${escapeHtml(entry.id ?? "")}">Edit</button>
        <button class="action-btn delete" data-action="delete-event" data-id="${escapeHtml(entry.id ?? "")}">Delete</button>
      </article>`,
  );
  updateEventControls();
}

function getEventErrorMessage(error) {
  if (error.message === "Session expired")
    return "Your session expired. Please sign in again.";
  if (error.message === "HTTP 403")
    return "You do not have permission to manage events.";
  if (error.message === "HTTP 404")
    return "This event could not be found. Refresh the list and try again.";
  return "Please try again. If the problem continues, check your connection and API settings.";
}

export async function loadEvents(successMessage = "") {
  // Only the newest request can replace the list or its status.
  const requestId = ++latestLoadId;
  isLoading = true;
  setEventStatus("Loading events...");
  updateEventControls();
  try {
    const payload = await apiRequest(apiEndpoints.events);
    if (payload === undefined) throw new Error("Session expired");
    if (!Array.isArray(payload)) throw new Error("Invalid events response");
    const records = normalizeEvents(payload);
    if (requestId === latestLoadId) {
      appData.events = records;
      renderEvents();
      setEventStatus(
        successMessage ||
          (records.length
            ? `${records.length} ${records.length === 1 ? "event" : "events"} loaded.`
            : "No events yet. Create your first event above."),
      );
    }
    return records;
  } catch (error) {
    if (requestId === latestLoadId) {
      const prefix = successMessage
        ? `${successMessage} The event list could not be refreshed.`
        : "Could not load events.";
      setEventStatus(`${prefix} ${getEventErrorMessage(error)}`, true);
    }
    throw error;
  } finally {
    if (requestId === latestLoadId) {
      isLoading = false;
      updateEventControls();
    }
  }
}

function resetEventForm() {
  const form = resetRecordForm("eventForm", "eventId");
  clearInputValidation(form);
}

function validateAndReadEventForm() {
  const form = document.getElementById("eventForm");
  const fields = Object.fromEntries(
    ["name", "owner", "progress", "date", "seatsTaken", "seatsTotal"].map(
      (key) => [
        key,
        document.getElementById(`event${key[0].toUpperCase()}${key.slice(1)}`),
      ],
    ),
  );
  clearInputValidation(form);
  for (const key of ["name", "owner", "date"]) {
    if (
      fields[key].maxLength > 0 &&
      fields[key].value.length > fields[key].maxLength
    )
      fields[key].setCustomValidity(
        `Use ${fields[key].maxLength} characters or fewer.`,
      );
    if (!fields[key].value.trim())
      fields[key].setCustomValidity("Please enter a value.");
  }
  for (const key of ["progress", "seatsTaken", "seatsTotal"]) {
    const value = Number(fields[key].value);
    // Seat counts map to Java Integer fields in the existing API.
    const maximum = key === "progress" ? 100 : 2147483647;
    if (
      !fields[key].value.trim() ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > maximum
    ) {
      fields[key].setCustomValidity(
        `Enter a whole number between 0 and ${maximum}.`,
      );
    }
  }
  if (Number(fields.seatsTaken.value) > Number(fields.seatsTotal.value)) {
    fields.seatsTaken.setCustomValidity(
      "Seats taken cannot exceed total seats.",
    );
  }
  if (!reportFormValidity(form)) {
    setEventStatus("Please correct the highlighted event fields.", true);
    return null;
  }
  return {
    name: fields.name.value.trim(),
    owner: fields.owner.value.trim(),
    progress: Number(fields.progress.value),
    eventDate: fields.date.value.trim(),
    seatsTaken: Number(fields.seatsTaken.value),
    seatsTotal: Number(fields.seatsTotal.value),
    upcoming: document.getElementById("eventUpcoming").checked,
  };
}

async function submitEventChange(
  request,
  { isDelete = false, successMessage, shouldResetForm },
) {
  isSaving = true;
  setEventStatus(isDelete ? "Deleting event..." : "Saving event...");
  updateEventControls();
  let mutationSucceeded = false;
  try {
    const result = await request();
    if (result === undefined) throw new Error("Session expired");
    mutationSucceeded = true;
    if (shouldResetForm) resetEventForm();
    await loadEvents(successMessage);
    showToast(successMessage);
  } catch (error) {
    showToast(
      mutationSucceeded
        ? `${successMessage} The list could not be refreshed. Please try Refresh Events.`
        : `Could not ${isDelete ? "delete" : "save"} event. ${getEventErrorMessage(error)}`,
      mutationSucceeded ? "warning" : "error",
    );
    // A successful write followed by a failed refresh must not invite a duplicate write.
    if (!mutationSucceeded) {
      setEventStatus(
        `Could not ${isDelete ? "delete" : "save"} event. ${getEventErrorMessage(error)}`,
        true,
      );
    }
  } finally {
    isSaving = false;
    updateEventControls();
    document
      .getElementById(mutationSucceeded ? "eventName" : "eventSubmitBtn")
      .focus();
  }
}

export function setupEventForm() {
  const form = document.getElementById("eventForm");
  // Validate explicitly so whitespace and cross-field rules share the same feedback.
  enhanceForm(form);
  form.addEventListener("input", () => {
    clearInputValidation(form);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isLoading || isSaving) return;
    const payload = validateAndReadEventForm();
    if (!payload) return;
    const id = document.getElementById("eventId").value;
    await submitEventChange(
      () => saveRecord(apiEndpoints.events, encodeURIComponent(id), payload),
      {
        successMessage: id ? "Event updated." : "Event created.",
        shouldResetForm: true,
      },
    );
  });
  document.getElementById("eventCancelBtn").addEventListener("click", () => {
    if (isLoading || isSaving) return;
    resetEventForm();
    setEventStatus("Event form cleared.");
  });
  document
    .getElementById("eventRefreshBtn")
    .addEventListener("click", async () => {
      if (isLoading || isSaving) return;
      try {
        await loadEvents();
      } catch {
        /* loadEvents displays the error. */
      }
    });
}

export async function handleEventAction(action, id) {
  if (isLoading || isSaving || !id) return;
  if (action === "edit-event") {
    const record = appData.events.find((entry) => String(entry.id) === id);
    if (!record) {
      setEventStatus(
        "This event could not be found. Refresh the list and try again.",
        true,
      );
      return;
    }
    resetEventForm();
    document.getElementById("eventId").value = record.id;
    document.getElementById("eventName").value = record.name;
    document.getElementById("eventOwner").value = record.owner;
    document.getElementById("eventProgress").value = record.progress;
    document.getElementById("eventDate").value = record.eventDate;
    document.getElementById("eventSeatsTaken").value = record.seatsTaken;
    document.getElementById("eventSeatsTotal").value = record.seatsTotal;
    document.getElementById("eventUpcoming").checked = record.upcoming;
    setView("events");
    setEventStatus(`Editing ${record.name}.`);
    document.getElementById("eventName").focus();
  }
  if (action === "delete-event") {
    if (!confirm("Delete this event?")) return;
    await submitEventChange(
      () =>
        deleteRecord(apiEndpoints.events, encodeURIComponent(id), {
          ignoreResponseBody: true,
        }),
      {
        isDelete: true,
        successMessage: "Event deleted.",
        shouldResetForm: document.getElementById("eventId").value === id,
      },
    );
  }
}

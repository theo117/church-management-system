import { appData, mockData, normalizeArray } from "./state.js";
import { apiEndpoints } from "./api.js";
import { setupRecordForm, deleteRecordWithFeedback } from "./forms.js";
import { setView, renderSimpleList, escapeHtml } from "./ui.js";

export function normalizeVolunteers(payload) {
  return normalizeArray(payload, mockData.volunteers).map((item) => ({
    id: item.id ?? null,
    message: item.message || "",
  }));
}

export function renderVolunteers() {
  renderSimpleList(
    "volunteerList",
    appData.volunteers,
    (entry) => `<li>${escapeHtml(entry.message)}
      <br/>
      <button class="action-btn" data-action="edit-volunteer" data-id="${escapeHtml(entry.id ?? "")}">Edit</button>
      <button class="action-btn delete" data-action="delete-volunteer" data-id="${escapeHtml(entry.id ?? "")}">Delete</button>
    </li>`,
  );
}

export function setupVolunteerForm(refreshData) {
  setupRecordForm({
    formId: "volunteerForm",
    recordIdInputId: "volunteerId",
    cancelButtonId: "volunteerCancelBtn",
    endpoint: apiEndpoints.volunteers,
    recordLabel: "Volunteer update",
    readPayload: () => ({
      message: document.getElementById("volunteerMessage").value,
    }),
    refreshData,
  });
}

export async function handleVolunteerAction(action, id, refreshData) {
  if (action === "edit-volunteer") {
    const record = appData.volunteers.find(
      (record) => String(record.id) === id,
    );
    if (!record) return;
    document.getElementById("volunteerId").value = record.id;
    document.getElementById("volunteerMessage").value = record.message;
    setView("volunteers");
  }

  if (action === "delete-volunteer" && id) {
    if (!confirm("Delete this volunteer update?")) return;
    await deleteRecordWithFeedback({
      endpoint: apiEndpoints.volunteers,
      recordId: id,
      formId: "volunteerForm",
      recordLabel: "Volunteer update",
      refreshData,
    });
  }
}

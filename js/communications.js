import { appData, mockData, normalizeArray } from "./state.js";
import { apiEndpoints } from "./api.js";
import { setupRecordForm, deleteRecordWithFeedback } from "./forms.js";
import { setView, renderSimpleList, escapeHtml } from "./ui.js";

export function normalizeCommunication(payload) {
  return normalizeArray(payload, mockData.communication).map((item) => ({
    id: item.id ?? null,
    channel: item.channel || "",
    audience: item.audience || "",
    status: item.status || "",
  }));
}

export function renderCommunication() {
  renderSimpleList(
    "communicationCards",
    appData.communication,
    (entry) => `<article>
      <strong>${escapeHtml(entry.channel)}</strong>
      <p>${escapeHtml(entry.audience)}</p>
      <p>Status: ${escapeHtml(entry.status)}</p>
      <button class="action-btn" data-action="edit-communication" data-id="${escapeHtml(entry.id ?? "")}">Edit</button>
      <button class="action-btn delete" data-action="delete-communication" data-id="${escapeHtml(entry.id ?? "")}">Delete</button>
    </article>`,
  );
}

export function setupCommunicationForm(refreshData) {
  setupRecordForm({
    formId: "communicationForm",
    recordIdInputId: "communicationId",
    cancelButtonId: "communicationCancelBtn",
    endpoint: apiEndpoints.communication,
    recordLabel: "Communication",
    readPayload: () => ({
      channel: document.getElementById("communicationChannel").value,
      audience: document.getElementById("communicationAudience").value,
      status: document.getElementById("communicationStatus").value,
    }),
    refreshData,
  });
}

export async function handleCommunicationAction(action, id, refreshData) {
  if (action === "edit-communication") {
    const record = appData.communication.find(
      (record) => String(record.id) === id,
    );
    if (!record) return;
    document.getElementById("communicationId").value = record.id;
    document.getElementById("communicationChannel").value = record.channel;
    document.getElementById("communicationAudience").value = record.audience;
    document.getElementById("communicationStatus").value = record.status;
    setView("communication");
  }

  if (action === "delete-communication" && id) {
    if (!confirm("Delete this communication item?")) return;
    await deleteRecordWithFeedback({
      endpoint: apiEndpoints.communication,
      recordId: id,
      formId: "communicationForm",
      recordLabel: "Communication",
      refreshData,
    });
  }
}

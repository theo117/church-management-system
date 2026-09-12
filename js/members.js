import { sortTableRecords, setupTableSorting } from "./tables.js";
import { appData, mockData, normalizeArray } from "./state.js";
import { apiEndpoints } from "./api.js";
import { setupRecordForm, deleteRecordWithFeedback } from "./forms.js";
import { setView, escapeHtml, renderCollection } from "./ui.js";

export function normalizeMembers(payload) {
  return normalizeArray(payload, mockData.members).map((item) => ({
    id: item.id ?? null,
    name: item.name || "Unknown",
    email: item.email || "",
    status: item.status || "active",
    ministry: item.ministry || "N/A",
    group: item.smallGroup || item.group || "N/A",
    lastAttended: item.lastAttended || item.last_attended || "N/A",
  }));
}

export function renderMembers() {
  const term = document
    .getElementById("memberSearch")
    .value.trim()
    .toLowerCase();
  const status = document.getElementById("memberStatusFilter").value;
  const filtered = appData.members.filter((member) => {
    const text =
      `${member.name} ${member.status} ${member.ministry} ${member.group}`.toLowerCase();
    return (
      (!term || text.includes(term)) &&
      (status === "all" || member.status === status)
    );
  });
  const records = sortTableRecords("memberTable", filtered);
  document.getElementById("memberResultCount").textContent =
    `${records.length} of ${appData.members.length} members`;
  renderCollection(
    "memberTableBody",
    records,
    (member) => `
      <tr>
        <td>${escapeHtml(member.name)}</td>
        <td>${escapeHtml(member.status)}</td>
        <td>${escapeHtml(member.ministry)}</td>
        <td>${escapeHtml(member.group)}</td>
        <td>${escapeHtml(member.lastAttended)}</td>
        <td>
          <button class="action-btn" data-action="edit-member" data-id="${escapeHtml(member.id ?? "")}">Edit</button>
          <button class="action-btn delete" data-action="delete-member" data-id="${escapeHtml(member.id ?? "")}">Delete</button>
        </td>
      </tr>`,
    appData.members.length
      ? "No members match these filters. Try a different search or status."
      : undefined,
  );
}

export function setupMemberFilters() {
  document
    .getElementById("memberSearch")
    .addEventListener("input", renderMembers);
  document
    .getElementById("memberStatusFilter")
    .addEventListener("change", renderMembers);
  setupTableSorting(
    "memberTable",
    ["name", "status", "ministry", "group"],
    renderMembers,
  );
}

export function setupMemberForm(refreshData) {
  setupRecordForm({
    formId: "memberForm",
    recordIdInputId: "memberId",
    cancelButtonId: "memberCancelBtn",
    endpoint: apiEndpoints.members,
    recordLabel: "Member",
    readPayload: () => ({
      name: document.getElementById("memberName").value,
      email: document.getElementById("memberEmail").value,
      status: document.getElementById("memberStatus").value,
      ministry: document.getElementById("memberMinistry").value,
      smallGroup: document.getElementById("memberGroup").value,
      lastAttended: document.getElementById("memberLastAttended").value,
    }),
    refreshData,
  });
}

export async function handleMemberAction(action, id, refreshData) {
  if (action === "edit-member") {
    const record = appData.members.find((record) => String(record.id) === id);
    if (!record) return;
    document.getElementById("memberId").value = record.id;
    document.getElementById("memberName").value = record.name;
    document.getElementById("memberEmail").value = record.email;
    document.getElementById("memberStatus").value = record.status;
    document.getElementById("memberMinistry").value = record.ministry;
    document.getElementById("memberGroup").value = record.group;
    document.getElementById("memberLastAttended").value = record.lastAttended;
    setView("members");
  }

  if (action === "delete-member" && id) {
    if (!confirm("Delete this member?")) return;
    await deleteRecordWithFeedback({
      endpoint: apiEndpoints.members,
      recordId: id,
      formId: "memberForm",
      recordLabel: "Member",
      refreshData,
    });
  }
}

import { sortTableRecords, setupTableSorting } from "./tables.js";
import { appData, mockData, normalizeArray } from "./state.js";
import { apiEndpoints } from "./api.js";
import { setupRecordForm, deleteRecordWithFeedback } from "./forms.js";
import {
  setView,
  renderSimpleList,
  escapeHtml,
  renderCollection,
  formatRand,
  parseRand,
} from "./ui.js";

export function normalizeDonations(payload) {
  return normalizeArray(payload, mockData.donations).map((item) => {
    const amountValue =
      item.amountValue != null
        ? Number(item.amountValue)
        : parseRand(item.amount);
    return {
      id: item.id ?? null,
      donor: item.donor || "Unknown",
      fund: item.fund || "General",
      amount: item.amount || formatRand(amountValue),
      amountValue,
      date: item.date || "",
    };
  });
}

function renderFundProgress() {
  renderSimpleList("fundProgress", appData.funds, (fund) => {
    const raised = Number(fund.raised) || 0;
    const goal = Number(fund.goal) || 1;
    const percent = Math.round((raised / goal) * 100);
    return `
        <div class="fund-row">
          <div class="meta">
            <strong>${escapeHtml(fund.name)}</strong>
          </div>
          <div class="bar"><span style="width:${Math.min(percent, 100)}%;"></span></div>
        </div>`;
  });
}

export function renderDonations() {
  renderFundProgress();

  const term = document
    .getElementById("donationSearch")
    .value.trim()
    .toLowerCase();
  const records = sortTableRecords(
    "donationTable",
    appData.donations.filter((entry) =>
      `${entry.donor} ${entry.fund} ${entry.date}`.toLowerCase().includes(term),
    ),
  );
  document.getElementById("donationResultCount").textContent =
    `${records.length} of ${appData.donations.length} donations`;
  renderCollection(
    "donationTableBody",
    records,
    (entry) => `<tr>
      <td>${escapeHtml(entry.donor)}</td>
      <td>${escapeHtml(entry.fund)}</td>
      <td>${escapeHtml(entry.amount)}</td>
      <td>${escapeHtml(entry.date)}</td>
      <td>
        <button class="action-btn" data-action="edit-donation" data-id="${escapeHtml(entry.id ?? "")}">Edit</button>
        <button class="action-btn delete" data-action="delete-donation" data-id="${escapeHtml(entry.id ?? "")}">Delete</button>
      </td>
    </tr>`,
    appData.donations.length ? "No donations match this search." : undefined,
  );
}

export function setupDonationForm(refreshData) {
  document
    .getElementById("donationSearch")
    .addEventListener("input", renderDonations);
  setupTableSorting(
    "donationTable",
    ["donor", "fund", "amountValue"],
    renderDonations,
  );
  setupRecordForm({
    formId: "donationForm",
    recordIdInputId: "donationId",
    cancelButtonId: "donationCancelBtn",
    endpoint: apiEndpoints.donations,
    recordLabel: "Donation",
    readPayload: () => ({
      donor: document.getElementById("donationDonor").value,
      fund: document.getElementById("donationFund").value,
      amount: Number(document.getElementById("donationAmount").value),
      date: document.getElementById("donationDate").value,
    }),
    refreshData,
  });
}

export async function handleDonationAction(action, id, refreshData) {
  if (action === "edit-donation") {
    const record = appData.donations.find((record) => String(record.id) === id);
    if (!record) return;
    document.getElementById("donationId").value = record.id;
    document.getElementById("donationDonor").value = record.donor;
    document.getElementById("donationFund").value = record.fund;
    document.getElementById("donationAmount").value = record.amountValue;
    document.getElementById("donationDate").value = record.date;
    setView("donations");
  }

  if (action === "delete-donation" && id) {
    if (!confirm("Delete this donation?")) return;
    await deleteRecordWithFeedback({
      endpoint: apiEndpoints.donations,
      recordId: id,
      formId: "donationForm",
      recordLabel: "Donation",
      refreshData,
    });
  }
}

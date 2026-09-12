import { appData } from "./state.js";
import { renderSimpleList, escapeHtml } from "./ui.js";

export function renderReports() {
  renderSimpleList(
    "reportCards",
    appData.reports,
    (entry) =>
      `<article><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.value)}</p></article>`,
  );
}

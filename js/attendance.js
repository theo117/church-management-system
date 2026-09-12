import { appData } from "./state.js";
import { renderSimpleList, escapeHtml } from "./ui.js";

export function renderAttendance() {
  renderSimpleList(
    "attendanceCards",
    appData.attendance,
    (entry) =>
      `<article><strong>${escapeHtml(entry.service)}</strong><p>${escapeHtml(entry.checkedIn)} checked in</p><p>${escapeHtml(entry.volunteers)} volunteers on duty</p></article>`,
  );
}

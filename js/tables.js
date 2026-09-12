const sorting = new Map();

export function sortTableRecords(tableId, records) {
  const sort = sorting.get(tableId);
  if (!sort) return records;
  return [...records].sort((first, second) => {
    const a = first[sort.key],
      b = second[sort.key];
    const comparison =
      typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a ?? "").localeCompare(String(b ?? ""), undefined, {
            numeric: true,
            sensitivity: "base",
          });
    return sort.direction === "ascending" ? comparison : -comparison;
  });
}

export function setupTableSorting(tableId, keys, render) {
  const table = document.getElementById(tableId);
  table.querySelectorAll("thead th").forEach((header, index) => {
    header.scope = "col";
    if (!keys[index]) return;
    const label = header.textContent;
    header.setAttribute("aria-sort", "none");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-sort";
    button.textContent = label;
    button.setAttribute("aria-label", `Sort by ${label}`);
    button.addEventListener("click", () => {
      const previous = sorting.get(tableId);
      const direction =
        previous?.key === keys[index] && previous.direction === "ascending"
          ? "descending"
          : "ascending";
      sorting.set(tableId, { key: keys[index], direction });
      table
        .querySelectorAll("th[aria-sort]")
        .forEach((item) => item.setAttribute("aria-sort", "none"));
      header.setAttribute("aria-sort", direction);
      render();
    });
    header.replaceChildren(button);
  });
}

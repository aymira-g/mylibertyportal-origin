// Builds a CSV file from a headers row + data rows and triggers a
// browser download. Used anywhere a table of records (roster, classes,
// attendance, analytics) needs to leave the app as a spreadsheet file
// instead of a printed page.
export function csvEscape(value) {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  let str = String(value);
  const isPureNumber = /^-?\d+(\.\d+)?$/.test(str.trim());
  if (!isPureNumber && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function exportTableCSV(filename, headers, rows) {
  const allRows = [headers, ...rows];
  const csvContent = allRows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  // Leading BOM so Excel/Google Sheets read UTF-8 (accented names, emoji) correctly.
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

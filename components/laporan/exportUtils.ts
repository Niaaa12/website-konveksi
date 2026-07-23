/**
 * Utility untuk ekspor Laporan ke format Excel (.csv dengan BOM UTF-8) dan Cetak (Print/PDF)
 */

export function downloadCSV(filename: string, rows: string[][]) {
  const processRow = (row: string[]) => {
    return row
      .map((val) => {
        const cleanVal = val === null || val === undefined ? "" : String(val);
        // Escape quotes
        const escaped = cleanVal.replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
  };

  const csvContent = "\uFEFF" + rows.map(processRow).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printDocument(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  const content = element.innerHTML;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Laporan SIM Konveksi Sodai Group</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #003247;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .company-title {
            font-size: 18px;
            font-weight: 700;
            color: #003247;
          }
          .company-sub {
            font-size: 11px;
            color: #6b7280;
          }
          .doc-title {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #003247;
          }
          .filter-info {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 16px;
            font-size: 11px;
          }
          .filter-info span {
            display: inline-block;
            margin-right: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background-color: #003247;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 8px 10px;
            font-size: 11px;
          }
          td {
            padding: 7px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 11px;
          }
          tr:nth-child(even) td {
            background-color: #f9fafb;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
          .badge-selesai { background-color: #dbeafe; color: #1e40af; }
          .badge-berjalan { background-color: #d1fae5; color: #065f46; }
          .badge-tertunda { background-color: #fef3c7; color: #92400e; }
          .badge-dijadwalkan { background-color: #f3f4f6; color: #374151; }
          .signature-box {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            page-break-inside: avoid;
          }
          .sig-item {
            text-align: center;
            width: 200px;
          }
          .sig-line {
            margin-top: 60px;
            border-bottom: 1px solid #9ca3af;
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

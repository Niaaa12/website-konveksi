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
        <title>Laporan Operasional SIM Konveksi Sodai Group</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #003247;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .company-title {
            font-size: 18px;
            font-weight: 700;
            color: #003247;
            letter-spacing: -0.5px;
          }
          .company-sub {
            font-size: 10px;
            color: #64748b;
          }
          .doc-title {
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
            color: #003247;
            text-transform: uppercase;
          }
          .filter-info {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 14px;
            font-size: 10.5px;
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #003247 !important;
            color: #ffffff !important;
            font-weight: 600;
            text-align: left;
            padding: 6px 8px;
            font-size: 10px;
            border: 1px solid #002233;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            font-size: 10.5px;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc !important;
          }
          tfoot td {
            font-weight: 700;
            background-color: #f1f5f9 !important;
            border-top: 2px solid #003247;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9.5px;
            font-weight: 600;
            text-transform: capitalize;
          }
          .badge-selesai { background-color: #d1fae5 !important; color: #065f46 !important; }
          .badge-berjalan { background-color: #dbeafe !important; color: #1e40af !important; }
          .badge-tertunda { background-color: #fef3c7 !important; color: #92400e !important; }
          .badge-dijadwalkan { background-color: #f3f4f6 !important; color: #374151 !important; }
          .badge-batal { background-color: #fee2e2 !important; color: #991b1b !important; }
          .signature-box {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .sig-item {
            text-align: center;
            width: 200px;
          }
          .sig-line {
            margin-top: 50px;
            border-bottom: 1px solid #64748b;
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

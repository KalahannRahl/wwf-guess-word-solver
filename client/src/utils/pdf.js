import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, getDayLabels } from '../api.js';

export function generatePDF(tc, entries) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 24;
  const blue = [30, 58, 95];
  const lightBlue = [219, 234, 254];
  const amber = [254, 243, 199];

  // Header background
  doc.setFillColor(...blue);
  doc.rect(0, 0, pageW, 56, 'F');

  // Logo text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ALLAN', margin, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('CONSTRUCTION', margin, 34);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE TIME CARD', margin + 90, 22);

  // Employee info (right side)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${tc.employee_name}`, pageW - 260, 16);
  doc.text(`Pay Period: ${formatDate(tc.pay_period_start)} – ${formatDate(tc.pay_period_end)}`, pageW - 260, 27);
  doc.text(`Status: ${(tc.status || 'draft').toUpperCase()}`, pageW - 260, 38);
  if (tc.submitted_at) {
    doc.text(`Submitted: ${new Date(tc.submitted_at).toLocaleDateString()}`, pageW - 260, 49);
  }

  const dayLabels = getDayLabels(tc.pay_period_start);

  // Build table columns
  const head = [
    [
      { content: 'JOB #', rowSpan: 1, styles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 } },
      { content: 'AREA', rowSpan: 1, styles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 } },
      { content: 'COST CODE', rowSpan: 1, styles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 } },
      ...dayLabels.map((d, i) => ({
        content: `${d.short}\n${d.label}`,
        styles: {
          fillColor: i < 7 ? [37, 99, 235] : [180, 83, 9],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6,
          halign: 'center',
        },
      })),
      { content: 'TOTAL', styles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7, halign: 'center' } },
    ],
  ];

  const body = entries.map((row, ri) => {
    const cc = row.cc_code ? `${row.cc_code}` : '';
    const rowTotal = Array.from({length:14}, (_,i) => parseFloat(row[`d${i+1}`])||0).reduce((a,b)=>a+b,0);
    return [
      row.job_number || '',
      row.area || '',
      cc,
      ...Array.from({length:14}, (_,i) => {
        const v = parseFloat(row[`d${i+1}`]) || 0;
        return { content: v > 0 ? v : '', styles: { fillColor: i < 7 ? lightBlue : amber, halign: 'center', fontSize: 7 } };
      }),
      { content: rowTotal > 0 ? rowTotal : '', styles: { fontStyle: 'bold', halign: 'center', textColor: blue, fontSize: 7 } },
    ];
  });

  // Totals footer
  const dayTotals = Array.from({length:14}, (_,i) => entries.reduce((s,r) => s+(parseFloat(r[`d${i+1}`])||0), 0));
  const grand = dayTotals.reduce((a,b) => a+b, 0);
  const footerRow = [
    { content: 'DAILY TOTALS', colSpan: 3, styles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7, halign: 'right' } },
    ...dayTotals.map((t, i) => ({
      content: t > 0 ? t : '',
      styles: { fillColor: i < 7 ? [37,99,235] : [146,64,14], textColor: [255,255,255], fontStyle: 'bold', halign: 'center', fontSize: 7 },
    })),
    { content: grand > 0 ? grand : '', styles: { fillColor: blue, textColor: [255,255,255], fontStyle: 'bold', halign: 'center', fontSize: 7 } },
  ];

  autoTable(doc, {
    head,
    body,
    foot: [footerRow],
    startY: 64,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 2, lineColor: [209, 213, 219], lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 50 },
      2: { cellWidth: 90 },
      // day columns 3-16
      17: { cellWidth: 28 }, // total
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    showFoot: 'lastPage',
    didParseCell(data) {
      // make day columns narrower
      if (data.column.index >= 3 && data.column.index <= 16) {
        data.cell.styles.cellWidth = 30;
      }
    },
  });

  if (tc.notes) {
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8).setTextColor(80, 80, 80).setFont('helvetica', 'normal');
    doc.text(`Notes: ${tc.notes}`, margin, finalY);
  }

  // Footer
  doc.setFontSize(7).setTextColor(160, 160, 160);
  doc.text(`Generated ${new Date().toLocaleString()} | Allan Construction`, margin, doc.internal.pageSize.getHeight() - 10);

  const empName = (tc.employee_name || 'timecard').replace(/\s+/g, '_');
  doc.save(`timecard_${empName}_${tc.pay_period_start}.pdf`);
}

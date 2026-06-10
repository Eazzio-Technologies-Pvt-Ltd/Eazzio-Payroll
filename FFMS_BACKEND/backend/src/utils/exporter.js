const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Generate Excel sheet for Attendance data
 */
const exportAttendanceExcel = async (records, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  // Set up header columns
  worksheet.columns = [
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Check In Time', key: 'checkIn', width: 20 },
    { header: 'Check Out Time', key: 'checkOut', width: 20 },
    { header: 'Working Minutes', key: 'minutes', width: 18 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Late', key: 'isLate', width: 10 },
    { header: 'Early Logout', key: 'isEarlyLogout', width: 15 }
  ];

  // Title styling
  worksheet.insertRow(1, ['Attendance Report', `${startDate} to ${endDate}`]);
  worksheet.mergeCells('A1:I1');
  worksheet.getRow(1).font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  worksheet.getRow(1).alignment = { horizontal: 'center' };
  worksheet.getRow(1).height = 40;

  worksheet.addRow([]); // Blank spacer

  // Styled Table Headers
  const headerRow = worksheet.getRow(3);
  headerRow.values = ['Employee ID', 'Name', 'Date', 'Check In Time', 'Check Out Time', 'Working Minutes', 'Status', 'Late', 'Early Logout'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

  // Add records
  records.forEach((rec) => {
    worksheet.addRow({
      employeeId: rec.user.employeeId,
      name: rec.user.name,
      date: rec.date.toISOString().split('T')[0],
      checkIn: rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : '-',
      checkOut: rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : '-',
      minutes: rec.workingMinutes || 0,
      status: rec.status,
      isLate: rec.isLate ? 'YES' : 'NO',
      isEarlyLogout: rec.isEarlyLogout ? 'YES' : 'NO'
    });
  });

  return workbook.xlsx.writeBuffer();
};

/**
 * Generate PDF document for Attendance data
 */
const exportAttendancePDF = async (records, startDate, endDate) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  // Add Header Box
  doc.rect(0, 0, 595.28, 80).fill('#4F46E5');
  doc.fillColor('#FFFFFF').fontSize(20).text('Field Force Management System (FFMS)', 30, 20, { bold: true });
  doc.fontSize(12).text(`Attendance Report: ${startDate} to ${endDate}`, 30, 48);

  doc.moveDown(4);

  // Drawing Table Headers
  doc.fillColor('#1F2937').fontSize(10);
  const startY = 120;
  doc.rect(30, startY, 535, 20).fill('#1F2937');
  
  doc.fillColor('#FFFFFF').text('Employee', 35, startY + 5);
  doc.text('Date', 150, startY + 5);
  doc.text('Check-In', 250, startY + 5);
  doc.text('Check-Out', 350, startY + 5);
  doc.text('Status', 480, startY + 5);

  let currentY = startY + 20;

  // Add records rows
  records.forEach((rec, idx) => {
    // Add page if list is too long
    if (currentY > 750) {
      doc.addPage();
      currentY = 40;
    }

    // Alternating background colors
    if (idx % 2 === 0) {
      doc.rect(30, currentY, 535, 20).fill('#F3F4F6');
    }

    doc.fillColor('#374151');
    doc.text(`${rec.user.name} (${rec.user.employeeId})`, 35, currentY + 5, { width: 110, height: 15, ellipsis: true });
    doc.text(rec.date.toISOString().split('T')[0], 150, currentY + 5);
    doc.text(rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : '-', 250, currentY + 5);
    doc.text(rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : '-', 350, currentY + 5);
    doc.text(rec.status, 480, currentY + 5);

    currentY += 20;
  });

  // Footer/Page Numbering
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#9CA3AF').fontSize(8).text(`Page ${i + 1} of ${pages.count}`, 30, 800, { align: 'center' });
  }

  doc.end();
  return doc;
};

/**
 * Generate Excel sheet for Visit reports data
 */
const exportVisitsExcel = async (records, startDate, endDate) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Visit Reports');

  worksheet.columns = [
    { header: 'Staff Member', key: 'staffName', width: 20 },
    { header: 'Customer Name', key: 'customerName', width: 20 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Visit Type', key: 'type', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Notes', key: 'notes', width: 35 },
    { header: 'Date', key: 'createdAt', width: 20 }
  ];

  worksheet.insertRow(1, ['Customer Visit Reports', `${startDate} to ${endDate}`]);
  worksheet.mergeCells('A1:H1');
  worksheet.getRow(1).font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  worksheet.getRow(1).alignment = { horizontal: 'center' };
  worksheet.getRow(1).height = 40;

  worksheet.addRow([]); // Blank spacer

  const headerRow = worksheet.getRow(3);
  headerRow.values = ['Staff Member', 'Customer Name', 'Phone', 'Address', 'Visit Type', 'Status', 'Notes', 'Date'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };

  records.forEach((rec) => {
    worksheet.addRow({
      staffName: rec.user.name,
      customerName: rec.customerName,
      phone: rec.customerPhone || '-',
      address: rec.customerAddress || '-',
      type: rec.visitType,
      status: rec.visitStatus,
      notes: rec.notes || '-',
      createdAt: new Date(rec.createdAt).toLocaleString()
    });
  });

  return workbook.xlsx.writeBuffer();
};

/**
 * Generate PDF document for Visit reports data
 */
const exportVisitsPDF = async (records, startDate, endDate) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  // Add Header Box
  doc.rect(0, 0, 595.28, 80).fill('#4F46E5');
  doc.fillColor('#FFFFFF').fontSize(20).text('Field Force Management System (FFMS)', 30, 20, { bold: true });
  doc.fontSize(12).text(`Visit Reports: ${startDate} to ${endDate}`, 30, 48);

  doc.moveDown(4);

  doc.fillColor('#1F2937').fontSize(10);
  const startY = 120;
  doc.rect(30, startY, 535, 20).fill('#1F2937');
  
  doc.fillColor('#FFFFFF').text('Staff', 35, startY + 5);
  doc.text('Customer', 150, startY + 5);
  doc.text('Type', 280, startY + 5);
  doc.text('Status', 380, startY + 5);
  doc.text('Date', 470, startY + 5);

  let currentY = startY + 20;

  records.forEach((rec, idx) => {
    if (currentY > 750) {
      doc.addPage();
      currentY = 40;
    }

    if (idx % 2 === 0) {
      doc.rect(30, currentY, 535, 20).fill('#F3F4F6');
    }

    doc.fillColor('#374151');
    doc.text(rec.user.name, 35, currentY + 5, { width: 110, ellipsis: true });
    doc.text(rec.customerName, 150, currentY + 5, { width: 120, ellipsis: true });
    doc.text(rec.visitType, 280, currentY + 5);
    doc.text(rec.visitStatus, 380, currentY + 5);
    doc.text(new Date(rec.createdAt).toLocaleDateString(), 470, currentY + 5);

    currentY += 20;
  });

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor('#9CA3AF').fontSize(8).text(`Page ${i + 1} of ${pages.count}`, 30, 800, { align: 'center' });
  }

  doc.end();
  return doc;
};

/**
 * Generate CSV string for Attendance data (Fast Streaming)
 */
const exportAttendanceCSV = (records) => {
  const header = ['Employee ID', 'Name', 'Date', 'Check In Time', 'Check Out Time', 'Working Minutes', 'Status', 'Late', 'Early Logout'].join(',');
  const rows = records.map(rec => {
    return [
      `"${rec.user.employeeId}"`,
      `"${rec.user.name}"`,
      `"${rec.date.toISOString().split('T')[0]}"`,
      `"${rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : '-'}"`,
      `"${rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : '-'}"`,
      rec.workingMinutes || 0,
      `"${rec.status}"`,
      `"${rec.isLate ? 'YES' : 'NO'}"`,
      `"${rec.isEarlyLogout ? 'YES' : 'NO'}"`
    ].join(',');
  });
  return [header, ...rows].join('\n');
};

/**
 * Generate CSV string for Visit reports data (Fast Streaming)
 */
const exportVisitsCSV = (records) => {
  const header = ['Staff Member', 'Customer Name', 'Phone', 'Address', 'Visit Type', 'Status', 'Notes', 'Date'].join(',');
  const rows = records.map(rec => {
    return [
      `"${rec.user.name}"`,
      `"${rec.customerName?.replace(/"/g, '""')}"`,
      `"${rec.customerPhone || '-'}"`,
      `"${rec.customerAddress?.replace(/"/g, '""') || '-'}"`,
      `"${rec.visitType}"`,
      `"${rec.visitStatus}"`,
      `"${rec.notes?.replace(/"/g, '""') || '-'}"`,
      `"${new Date(rec.createdAt).toLocaleString()}"`
    ].join(',');
  });
  return [header, ...rows].join('\n');
};

module.exports = {
  exportAttendanceExcel,
  exportAttendancePDF,
  exportAttendanceCSV,
  exportVisitsExcel,
  exportVisitsPDF,
  exportVisitsCSV
};

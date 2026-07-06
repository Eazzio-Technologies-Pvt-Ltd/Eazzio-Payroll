'use strict';
const prisma = require('../config/prisma');
const PDFDocument = require('pdfkit');
const { sendEmail } = require('../utils/email');
const salaryService = require('../services/salary.service');
const { getISTDateBoundaries, getWorkingDaysInMonth } = require('../utils/salaryUtils');

// ─── Shared helper: draw payslip PDF onto a PDFDocument ──────────────────────
const buildPayslipDoc = (doc, { companyName, user, month, totalWorkingDays, effectiveWorkingDays, baseSalary, bonus, perDaySalary, unpaidLeaveDeduction, advancesDeduction, netSalary, presentDays, lateDays, halfDays, absentDays }) => {
  // ── Company Header ──
  doc.fontSize(22).font('Helvetica-Bold').text(companyName, { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').lineWidth(1).stroke();
  doc.strokeColor('black').lineWidth(1);
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text('SALARY PAYSLIP', { align: 'center', underline: true });
  doc.fontSize(12).font('Helvetica').text(`For the Month of: ${month}`, { align: 'center' });
  doc.moveDown(1.5);

  // ── Employee Details ──
  doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(11);
  doc.text(`Employee Name  :  ${user.name}`);
  doc.text(`Employee ID       :  ${user.employeeId || 'N/A'}`);
  doc.text(`Designation        :  ${user.role || 'N/A'}`);
  if (user.email) doc.text(`Email                   :  ${user.email}`);
  doc.moveDown(1.5);

  // ── Attendance Summary ──
  doc.fontSize(12).font('Helvetica-Bold').text('Attendance Summary', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(11);

  const col1 = 50;
  const col2 = 200;
  const col3 = 310;
  const col4 = 460;

  const summaryY = doc.y;
  doc.text(`Total Working Days:`, col1, summaryY);
  doc.font('Helvetica-Bold').text(`${totalWorkingDays}`, col2, summaryY);
  doc.font('Helvetica').text(`Present (incl. Late):`, col3, summaryY);
  doc.font('Helvetica-Bold').text(`${presentDays + lateDays}`, col4, summaryY);
  doc.font('Helvetica');
  doc.moveDown(0.6);

  const summaryY2 = doc.y;
  doc.text(`Effective Days Worked:`, col1, summaryY2);
  doc.font('Helvetica-Bold').text(`${effectiveWorkingDays}`, col2, summaryY2);
  doc.font('Helvetica').text(`Half Day:`, col3, summaryY2);
  doc.font('Helvetica-Bold').text(`${halfDays}`, col4, summaryY2);
  doc.font('Helvetica');
  doc.moveDown(0.6);

  const summaryY3 = doc.y;
  doc.text(`Days Absent / Missed:`, col1, summaryY3);
  doc.font('Helvetica-Bold').text(`${Math.max(0, totalWorkingDays - effectiveWorkingDays)}`, col2, summaryY3);
  doc.font('Helvetica').text(`Absent:`, col3, summaryY3);
  doc.font('Helvetica-Bold').text(`${absentDays}`, col4, summaryY3);
  doc.font('Helvetica');
  doc.moveDown(0.6);

  doc.text(`Per Day Salary:`, col1, doc.y);
  doc.font('Helvetica-Bold').text(`Rs. ${perDaySalary.toFixed(2)}`, col2, doc.y);
  doc.font('Helvetica');
  doc.moveDown(1.5);

  // ── Salary Table ──
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  const tableTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Earnings', 50, tableTop);
  doc.text('Amount (Rs.)', 200, tableTop);
  doc.text('Deductions', 310, tableTop);
  doc.text('Amount (Rs.)', 450, tableTop);

  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(11);

  // Row 1
  const r1y = doc.y;
  doc.text('Base Salary', 50, r1y);
  doc.text(baseSalary.toFixed(2), 200, r1y);
  doc.text('Unpaid Leave Deduct.', 310, r1y);
  doc.text(unpaidLeaveDeduction.toFixed(2), 450, r1y);
  doc.moveDown(0.6);

  // Row 2
  const r2y = doc.y;
  doc.text('Bonus / Incentive', 50, r2y);
  doc.text(bonus.toFixed(2), 200, r2y);
  doc.text('Advance Salary Deduct.', 310, r2y);
  doc.text(advancesDeduction.toFixed(2), 450, r2y);
  doc.moveDown(0.8);

  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);

  // Gross
  const grossRow = doc.y;
  const gross = baseSalary + bonus;
  const totalDeductions = unpaidLeaveDeduction + advancesDeduction;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('Gross Earnings', 50, grossRow);
  doc.text(gross.toFixed(2), 200, grossRow);
  doc.text('Total Deductions', 310, grossRow);
  doc.text(totalDeductions.toFixed(2), 450, grossRow);
  doc.moveDown(0.8);

  doc.moveTo(50, doc.y).lineTo(550, doc.y).lineWidth(2).stroke();
  doc.lineWidth(1);
  doc.moveDown(0.5);

  // Net Salary
  const netRow = doc.y;
  doc.fontSize(13);
  doc.text('NET SALARY PAYABLE:', 50, netRow);
  doc.text(`Rs. ${netSalary.toFixed(2)}`, 310, netRow);
  doc.moveDown(3);

  // Footer
  doc.fontSize(9).font('Helvetica').fillColor('#888888');
  doc.text('This is a computer-generated payslip and does not require a physical signature.', { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'center' });
  doc.fillColor('black');
};

// ─── Shared helper: gather payslip data ──────────────────────────────────────
const gatherPayslipData = async (userId, organizationId, month) => {
  const [year, m] = month.split('-').map(Number);

  // IST-safe boundaries — aligns with @db.Date records stored in IST
  const { startDate, endDate: endDateBoundary } = getISTDateBoundaries(month);

  const totalWorkingDays = getWorkingDaysInMonth(year, m);

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) return null;

  const attendances = await prisma.attendance.findMany({
    where: { userId, date: { gte: startDate, lte: endDateBoundary } }
  });

  let presentDays = 0, lateDays = 0, absentDays = 0, halfDays = 0;
  attendances.forEach(a => {
    if (a.status === 'PRESENT') presentDays++;
    else if (a.status === 'LATE') lateDays++;
    else if (a.status === 'ABSENT') absentDays++;
    else if (a.status === 'HALF_DAY') halfDays++;
  });

  const presentCredit = presentDays + lateDays + (halfDays * 0.5);
  const effectiveWorkingDays = Math.min(presentCredit, totalWorkingDays);

  const baseSalary = user.baseSalary || 0;
  const bonus = user.bonus || 0;
  const perDaySalary = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;

  let unpaidLeaveDeduction = 0;
  if (effectiveWorkingDays < totalWorkingDays) {
    unpaidLeaveDeduction = (totalWorkingDays - effectiveWorkingDays) * perDaySalary;
  }

  // Fetch approved advances for the month
  const advances = await prisma.advance.findMany({
    where: {
      userId,
      status: 'APPROVED',
      dateApproved: { gte: startDate, lte: endDateBoundary }
    },
    select: { amount: true }
  });
  const advancesDeduction = advances.reduce((sum, a) => sum + (a.amount || 0), 0);

  const netSalary = Math.max(0, (baseSalary - unpaidLeaveDeduction) + bonus - advancesDeduction);

  return {
    user,
    month,
    totalWorkingDays,
    effectiveWorkingDays,
    baseSalary,
    bonus,
    perDaySalary,
    unpaidLeaveDeduction,
    advancesDeduction,
    netSalary,
    presentDays,
    lateDays,
    halfDays,
    absentDays
  };
};

// ─── Controllers ─────────────────────────────────────────────────────────────

exports.getSalaryList = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { month } = req.query;
    const result = await salaryService.getSalaryList(organizationId, month);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[salary.controller] getSalaryList Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch salary data' } });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { baseSalary, bonus } = req.body;
    const updatedUser = await salaryService.updateSalaryStructure(userId, organizationId, { baseSalary, bonus });
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('[salary.controller] updateSalaryStructure Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update salary structure' } });
  }
};

exports.generateSlip = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { month, companyName } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    const data = await gatherPayslipData(userId, organizationId, month);
    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const customCompanyName = companyName || 'Eazzio Technologies Pvt Ltd';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Salary_Slip_${data.user.name.replace(/\s+/g, '_')}_${month}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    buildPayslipDoc(doc, { companyName: customCompanyName, ...data });
    doc.end();

  } catch (error) {
    console.error('[salary.controller] generateSlip Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error generating payslip' });
    }
  }
};

exports.emailSlip = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { month, companyName } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    const data = await gatherPayslipData(userId, organizationId, month);
    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!data.user.email) {
      return res.status(400).json({ success: false, message: `${data.user.name} has no email address on file. Please update their profile first.` });
    }

    const customCompanyName = companyName || 'Eazzio Technologies Pvt Ltd';

    // Generate PDF to buffer
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      buildPayslipDoc(doc, { companyName: customCompanyName, ...data });
      doc.end();
    });

    const pdfBuffer = Buffer.concat(buffers);

    await sendEmail({
      to: data.user.email,
      subject: `Your Salary Slip for ${month} — ${customCompanyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Salary Payslip — ${month}</h2>
          <p>Dear <strong>${data.user.name}</strong>,</p>
          <p>Please find your salary payslip for the month of <strong>${month}</strong> attached to this email.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #555;">Net Salary Payable:</td><td style="padding: 6px 0; font-weight: bold;">Rs. ${data.netSalary.toFixed(2)}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Working Days:</td><td style="padding: 6px 0;">${data.totalWorkingDays}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Days Present:</td><td style="padding: 6px 0;">${data.presentDays + data.lateDays}</td></tr>
          </table>
          <p style="color: #888; font-size: 12px;">This is an auto-generated email from ${customCompanyName}. Please do not reply to this email.</p>
        </div>
      `,
      attachments: [
        {
          filename: `Salary_Slip_${data.user.name.replace(/\s+/g, '_')}_${month}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    res.json({ success: true, message: `Salary slip sent to ${data.user.email}` });

  } catch (error) {
    console.error('[salary.controller] emailSlip Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Server error sending payslip email' });
    }
  }
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const PDFDocument = require('pdfkit');
const { sendEmail } = require('../utils/email');

exports.getSalaryList = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { month } = req.query; // format: "YYYY-MM"

    const result = await salaryService.getSalaryList(organizationId, month);

    res.json({
      success: true,
      data: result,
    });
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
    const { month, companyName } = req.query; // format: "YYYY-MM"

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }
    
    const customCompanyName = companyName || 'Eazzio Technologies Pvt Ltd';

    const [year, m] = month.split('-');
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);
    const endDateBoundary = new Date(endDate);
    endDateBoundary.setHours(23, 59, 59, 999);

    let totalWorkingDays = 0;
    for (let d = new Date(startDate); d <= endDateBoundary; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) totalWorkingDays++;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDateBoundary
        }
      }
    });

    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let halfDays = 0;

    attendances.forEach(a => {
      if (a.status === 'PRESENT') presentDays++;
      else if (a.status === 'LATE') lateDays++;
      else if (a.status === 'ABSENT') absentDays++;
      else if (a.status === 'HALF_DAY') halfDays++;
    });

    const presentCredit = presentDays + lateDays + (halfDays * 0.5);
    const effectiveWorkingDays = presentCredit; // Simplistic logic for now

    const baseSalary = user.baseSalary || 0;
    const bonus = user.bonus || 0;
    const perDaySalary = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
    
    // Deductions: if they worked fewer days than totalWorkingDays
    let unpaidLeaveDeduction = 0;
    if (effectiveWorkingDays < totalWorkingDays) {
      const missedDays = totalWorkingDays - effectiveWorkingDays;
      unpaidLeaveDeduction = missedDays * perDaySalary;
    }

    const netSalary = (baseSalary - unpaidLeaveDeduction) + bonus;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Salary_Slip_${user.name.replace(/\s+/g, '_')}_${month}.pdf`);

    doc.pipe(res);

    // Company Header
    doc.fontSize(20).text(customCompanyName, { align: 'center' });
    doc.fontSize(10).text('123 Business Road, Tech Park, City, Country', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('SALARY SLIP', { align: 'center', underline: true });
    doc.fontSize(12).text(`For the Month of ${month}`, { align: 'center' });
    doc.moveDown(2);

    // Employee Details
    doc.fontSize(12).text(`Employee Name: ${user.name}`);
    doc.text(`Employee ID: ${user.employeeId || 'N/A'}`);
    doc.text(`Designation: ${user.role}`);
    doc.text(`Department: ${user.department || 'N/A'}`);
    doc.moveDown();

    // Attendance Summary
    doc.fontSize(12).font('Helvetica-Bold').text('Calculation Details', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Total Working Days: ${totalWorkingDays} days`);
    doc.text(`Effective Present Days: ${effectiveWorkingDays} days`);
    doc.text(`Absent / Missed Days: ${Math.max(0, totalWorkingDays - effectiveWorkingDays)} days`);
    doc.moveDown(0.5);
    doc.text(`Per Day Salary: Rs. ${perDaySalary.toFixed(2)}  (Base Salary / Total Working Days)`);
    doc.text(`Unpaid Leave Deduction: Rs. ${unpaidLeaveDeduction.toFixed(2)}  (Missed Days x Per Day Salary)`);
    doc.moveDown(1.5);

    // Salary Table Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Earnings', 50, tableTop);
    doc.text('Amount', 200, tableTop);
    doc.text('Deductions', 300, tableTop);
    doc.text('Amount', 450, tableTop);
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    doc.text('Base Salary', 50, doc.y);
    doc.text(`Rs. ${baseSalary.toFixed(2)}`, 200, doc.y);
    doc.text('Unpaid Leave', 300, doc.y);
    doc.text(`Rs. ${unpaidLeaveDeduction.toFixed(2)}`, 450, doc.y);
    
    doc.moveDown(0.5);
    doc.text('Bonus', 50, doc.y);
    doc.text(`Rs. ${bonus.toFixed(2)}`, 200, doc.y);
    
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold');
    doc.text('Net Salary Payable:', 300, doc.y);
    doc.text(`Rs. ${netSalary.toFixed(2)}`, 450, doc.y);

    doc.moveDown(4);
    doc.font('Helvetica').fontSize(10);
    doc.text('This is a computer generated document and does not require a signature.', { align: 'center', color: 'grey' });

    doc.end();

  } catch (error) {
    console.error('Error generating slip:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

exports.emailSlip = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { month, companyName } = req.query; // format: "YYYY-MM"

    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }
    
    const customCompanyName = companyName || 'Eazzio Technologies Pvt Ltd';

    const [year, m] = month.split('-');
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0);
    const endDateBoundary = new Date(endDate);
    endDateBoundary.setHours(23, 59, 59, 999);

    let totalWorkingDays = 0;
    for (let d = new Date(startDate); d <= endDateBoundary; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) totalWorkingDays++;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'User has no email registered' });
    }

    const attendances = await prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDateBoundary
        }
      }
    });

    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let halfDays = 0;

    attendances.forEach(a => {
      if (a.status === 'PRESENT') presentDays++;
      else if (a.status === 'LATE') lateDays++;
      else if (a.status === 'ABSENT') absentDays++;
      else if (a.status === 'HALF_DAY') halfDays++;
    });

    const presentCredit = presentDays + lateDays + (halfDays * 0.5);
    const effectiveWorkingDays = presentCredit;

    const baseSalary = user.baseSalary || 0;
    const bonus = user.bonus || 0;
    const perDaySalary = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
    
    let unpaidLeaveDeduction = 0;
    if (effectiveWorkingDays < totalWorkingDays) {
      const missedDays = totalWorkingDays - effectiveWorkingDays;
      unpaidLeaveDeduction = missedDays * perDaySalary;
    }

    const netSalary = (baseSalary - unpaidLeaveDeduction) + bonus;

    // Generate PDF to a buffer
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    // Once finished, send the email
    doc.on('end', async () => {
      try {
        const pdfData = Buffer.concat(buffers);
        
        await sendEmail({
          to: user.email,
          subject: `Your Salary Slip for ${month}`,
          html: `<p>Dear ${user.name},</p><p>Please find attached your salary slip for the month of ${month}.</p>`,
          attachments: [
            {
              filename: `Salary_Slip_${month}.pdf`,
              content: pdfData,
              contentType: 'application/pdf'
            }
          ]
        });

        res.json({ success: true, message: 'Salary slip sent successfully' });
      } catch (err) {
        console.error('Error sending slip email:', err);
        res.status(500).json({ success: false, message: 'Failed to send email' });
      }
    });

    // Company Header
    doc.fontSize(20).text(customCompanyName, { align: 'center' });
    doc.fontSize(10).text('123 Business Road, Tech Park, City, Country', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('SALARY SLIP', { align: 'center', underline: true });
    doc.fontSize(12).text(`For the Month of ${month}`, { align: 'center' });
    doc.moveDown(2);

    // Employee Details
    doc.fontSize(12).text(`Employee Name: ${user.name}`);
    doc.text(`Employee ID: ${user.employeeId || 'N/A'}`);
    doc.text(`Designation: ${user.role}`);
    doc.text(`Department: ${user.department || 'N/A'}`);
    doc.moveDown();

    // Attendance Summary
    doc.fontSize(12).font('Helvetica-Bold').text('Calculation Details', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Total Working Days: ${totalWorkingDays} days`);
    doc.text(`Effective Present Days: ${effectiveWorkingDays} days`);
    doc.text(`Absent / Missed Days: ${Math.max(0, totalWorkingDays - effectiveWorkingDays)} days`);
    doc.moveDown(0.5);
    doc.text(`Per Day Salary: Rs. ${perDaySalary.toFixed(2)}  (Base Salary / Total Working Days)`);
    doc.text(`Unpaid Leave Deduction: Rs. ${unpaidLeaveDeduction.toFixed(2)}  (Missed Days x Per Day Salary)`);
    doc.moveDown(1.5);

    // Salary Table Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Earnings', 50, tableTop);
    doc.text('Amount', 200, tableTop);
    doc.text('Deductions', 300, tableTop);
    doc.text('Amount', 450, tableTop);
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    doc.text('Base Salary', 50, doc.y);
    doc.text(`Rs. ${baseSalary.toFixed(2)}`, 200, doc.y);
    doc.text('Unpaid Leave', 300, doc.y);
    doc.text(`Rs. ${unpaidLeaveDeduction.toFixed(2)}`, 450, doc.y);
    
    doc.moveDown(0.5);
    doc.text('Bonus', 50, doc.y);
    doc.text(`Rs. ${bonus.toFixed(2)}`, 200, doc.y);
    
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold');
    doc.text('Net Salary Payable:', 300, doc.y);
    doc.text(`Rs. ${netSalary.toFixed(2)}`, 450, doc.y);

    doc.moveDown(4);
    doc.font('Helvetica').fontSize(10);
    doc.text('This is a computer generated document and does not require a signature.', { align: 'center', color: 'grey' });

    doc.end();

  } catch (error) {
    console.error('Error generating email slip:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

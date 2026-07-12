const { gatherPayslipData } = require('./src/services/salary.service');
// Test January edge case - prev month should be Dec of previous year
const testDate = (month) => {
  const [year, m] = month.split('-').map(Number);
  const periodEndDate = new Date(year, m - 1, 10);
  const periodStartDate = new Date(year, m - 2, 10);
  const fmt = (d) => d.toLocaleDateString('en-GB', { 
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' 
  });
  console.log(`Month: ${month}  Period: ${fmt(periodStartDate)}  ${fmt(periodEndDate)}`);
};
testDate('2026-07'); // Normal case
testDate('2026-01'); // January edge case - should show Dec 2025
testDate('2026-12'); // December

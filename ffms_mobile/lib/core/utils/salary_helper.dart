import 'dart:core';

/// Helper to calculate the number of dynamic working days in a month (Mon-Sat, excluding Sundays)
int getWorkingDaysInMonth(DateTime date) {
  final year = date.year;
  final month = date.month;
  int workingDays = 0;
  
  // Find last day of the month by getting the 0th day of the next month
  final daysInMonth = DateTime(year, month + 1, 0).day;
  
  for (int day = 1; day <= daysInMonth; day++) {
    final d = DateTime(year, month, day);
    if (d.weekday != DateTime.sunday) {
      workingDays++;
    }
  }
  return workingDays;
}

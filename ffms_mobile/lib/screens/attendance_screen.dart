import 'package:flutter/material.dart';
import '../widgets/skeleton_loader.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/attendance_provider.dart';
import '../models/attendance_model.dart';
import '../widgets/status_badge.dart';
import '../core/theme/app_theme.dart';
import 'apply_leave_screen.dart';
import '../widgets/staggered_list_item.dart';

// Attendance history screen v2 — premium cards + customized action appbar
class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;
  
  bool _isCalendarView = true;
  DateTime _focusedMonth = DateTime.now();
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    ));
    _animController.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<AttendanceProvider>(context, listen: false).fetchHistory();
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Widget _buildMonthSelector() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: AppColors.primary),
            onPressed: () {
              setState(() {
                _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1);
              });
            },
          ),
          Text(
            DateFormat('MMMM yyyy').format(_focusedMonth),
            style: GoogleFonts.inter(
              fontWeight: FontWeight.bold,
              fontSize: 16,
              color: AppColors.textPrimary,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, color: AppColors.primary),
            onPressed: () {
              setState(() {
                _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1);
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildWeekdaysHeader() {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
      child: Row(
        children: days.map((day) {
          return Expanded(
            child: Center(
              child: Text(
                day,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textTertiary,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCalendarGrid(AttendanceProvider provider) {
    // Prefix days before the 1st of the month (Monday = 1, Sunday = 7)
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final prefixDays = firstDay.weekday - 1;
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final totalCells = prefixDays + daysInMonth;

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 12.0),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisSpacing: 8.0,
        crossAxisSpacing: 8.0,
        childAspectRatio: 1.0,
      ),
      itemCount: totalCells,
      itemBuilder: (context, index) {
        if (index < prefixDays) {
          return const SizedBox.shrink();
        }
        final day = index - prefixDays + 1;
        final date = DateTime(_focusedMonth.year, _focusedMonth.month, day);
        return _buildDateTile(date, provider);
      },
    );
  }

  Widget _buildDateTile(DateTime date, AttendanceProvider provider) {
    // Find logs for this specific date
    final logs = provider.attendanceHistory
        .where((log) => DateUtils.isSameDay(log.date, date))
        .toList();
    // Sort by sessionNumber descending to ensure the latest session (with calculated status) is first
    logs.sort((a, b) => b.sessionNumber.compareTo(a.sessionNumber));
    final log = logs.isNotEmpty ? logs.first : null;

    final isSelected = DateUtils.isSameDay(date, _selectedDate);
    final today = DateTime.now();
    final isToday = DateUtils.isSameDay(date, today);
    final isFuture = date.isAfter(today) && !isToday;

    Color tileBg = Colors.white;
    Color textColor = AppColors.textPrimary;
    String? statusType;

    if (isFuture) {
      tileBg = Colors.white;
      textColor = AppColors.textTertiary;
    } else if (log != null) {
      final statusUpper = log.status.toUpperCase();
      if (statusUpper == 'PRESENT' || statusUpper == 'ON_DUTY' || statusUpper == 'COMPLETED' || statusUpper == 'LATE') {
        tileBg = AppColors.successSoft;
        textColor = AppColors.success;
        statusType = 'PRESENT';
      } else if (statusUpper == 'ABSENT') {
        tileBg = AppColors.errorSoft;
        textColor = AppColors.error;
        statusType = 'ABSENT';
      } else if (statusUpper == 'HALF_DAY') {
        tileBg = AppColors.warningSoft;
        textColor = AppColors.warning;
        statusType = 'HALF_DAY';
      } else {
        tileBg = AppColors.warningSoft;
        textColor = AppColors.warning;
        statusType = 'PENDING';
      }
    } else {
      final weekday = date.weekday;
      if (weekday == DateTime.saturday || weekday == DateTime.sunday) {
        tileBg = AppColors.bgPage;
        textColor = AppColors.textSecondary;
        statusType = 'WEEKLY_OFF';
      } else {
        tileBg = AppColors.border.withOpacity(0.4);
        textColor = AppColors.textTertiary;
        statusType = 'UNMARKED';
      }
    }

    return InkWell(
      onTap: () {
        setState(() {
          _selectedDate = date;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: tileBg,
          borderRadius: BorderRadius.circular(12),
          border: isSelected
              ? Border.all(color: AppColors.primary, width: 2.0)
              : isToday
                  ? Border.all(color: AppColors.primary.withOpacity(0.5), width: 1.0)
                  : Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Text(
              '${date.day}',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: isSelected || isToday ? FontWeight.bold : FontWeight.w500,
                color: textColor,
              ),
            ),
            if (statusType != null && statusType != 'WEEKLY_OFF' && statusType != 'UNMARKED')
              Positioned(
                bottom: 4,
                child: Container(
                  width: 4,
                  height: 4,
                  decoration: BoxDecoration(
                    color: textColor,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildLegendItem('Present', AppColors.success),
          _buildLegendItem('Absent', AppColors.error),
          _buildLegendItem('Half Day', AppColors.warning),
          _buildLegendItem('Weekly Off', AppColors.textTertiary),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildDraggableDetailPanel(AttendanceProvider provider) {
    final selectedLogs = provider.attendanceHistory
        .where((log) => DateUtils.isSameDay(log.date, _selectedDate))
        .toList();
    // Sort by sessionNumber ascending for step-by-step chronological session order
    selectedLogs.sort((a, b) => a.sessionNumber.compareTo(b.sessionNumber));

    return DraggableScrollableSheet(
      initialChildSize: 0.22,
      minChildSize: 0.18,
      maxChildSize: 0.55,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.08),
                blurRadius: 16,
                offset: const Offset(0, -4),
              ),
            ],
            border: Border.all(color: AppColors.border, width: 1),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    DateFormat('EEEE, dd MMM yyyy').format(_selectedDate),
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (selectedLogs.isNotEmpty)
                    StatusBadge(status: selectedLogs.last.status)
                  else if (_selectedDate.isAfter(DateTime.now()) && !DateUtils.isSameDay(_selectedDate, DateTime.now()))
                    const StatusBadge(status: 'FUTURE')
                  else if (_selectedDate.weekday == DateTime.saturday || _selectedDate.weekday == DateTime.sunday)
                    const StatusBadge(status: 'OFF_DUTY')
                  else
                    const StatusBadge(status: 'ABSENT'),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(),
              ..._buildPanelLogs(selectedLogs),
            ],
          ),
        );
      },
    );
  }

  List<Widget> _buildPanelLogs(List<AttendanceModel> selectedLogs) {
    if (selectedLogs.isEmpty) {
      return [
        const SizedBox(height: 16),
        Center(
          child: Column(
            children: [
              Icon(
                _selectedDate.weekday == DateTime.saturday || _selectedDate.weekday == DateTime.sunday
                    ? Icons.weekend_outlined
                    : Icons.event_busy_outlined,
                size: 40,
                color: AppColors.textTertiary,
              ),
              const SizedBox(height: 12),
              Text(
                _selectedDate.weekday == DateTime.saturday || _selectedDate.weekday == DateTime.sunday
                    ? 'Weekly Off'
                    : 'No attendance logs recorded for this day',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ];
    }

    final List<Widget> list = [];
    
    // Calculate cumulative hours for this day
    double cumulativeHours = 0.0;
    bool hasHours = false;
    for (final log in selectedLogs) {
      if (log.totalWorkingHours != null) {
        cumulativeHours += log.totalWorkingHours!;
        hasHours = true;
      }
    }
    
    // If multiple sessions, show cumulative summary card at the very top
    if (selectedLogs.length > 1 && hasHours) {
      list.add(
        Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.primarySoft.withOpacity(0.4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primary.withOpacity(0.2), width: 1),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Cumulative Daily Duration',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
              Text(
                '${cumulativeHours.toStringAsFixed(1)} hrs',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryDark,
                ),
              ),
            ],
          ),
        ),
      );
    }

    for (int i = 0; i < selectedLogs.length; i++) {
      final log = selectedLogs[i];
      final punchInStr = log.punchInTime != null
          ? DateFormat('hh:mm a').format(log.punchInTime!.toLocal())
          : '--:--';
      final punchOutStr = log.punchOutTime != null
          ? DateFormat('hh:mm a').format(log.punchOutTime!.toLocal())
          : '--:--';

      if (selectedLogs.length > 1) {
        list.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 8.0, top: 4.0),
            child: Text(
              'Session ${log.sessionNumber}',
              style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: AppColors.primary,
              ),
            ),
          ),
        );
      }

      list.add(
        Row(
          children: [
            Expanded(
              child: _buildDetailField(
                'PUNCH IN',
                punchInStr,
                log.punchInLat != null && log.punchInLng != null
                    ? '${log.punchInLat!.toStringAsFixed(5)}, ${log.punchInLng!.toStringAsFixed(5)}'
                    : 'Location N/A',
                Icons.login_rounded,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildDetailField(
                'PUNCH OUT',
                punchOutStr,
                log.punchOutLat != null && log.punchOutLng != null
                    ? '${log.punchOutLat!.toStringAsFixed(5)}, ${log.punchOutLng!.toStringAsFixed(5)}'
                    : 'Location N/A',
                Icons.logout_rounded,
              ),
            ),
          ],
        ),
      );
      list.add(const SizedBox(height: 12));

      if (log.totalWorkingHours != null) {
        list.add(_buildHoursField(log.totalWorkingHours!));
        list.add(const SizedBox(height: 12));
      }
    }
    return list;
  }

  Widget _buildDetailField(String label, String time, String sub, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppColors.bgPage,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textTertiary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  time,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  sub,
                  style: GoogleFonts.inter(
                    fontSize: 8,
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHoursField(double hours) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.primarySoft,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Total Working Duration',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.primaryDark,
            ),
          ),
          Text(
            '${hours.toStringAsFixed(1)} hrs',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final attendanceProvider = Provider.of<AttendanceProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text(
          'My Attendance',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(_isCalendarView ? Icons.list : Icons.calendar_month, color: AppColors.primary),
            onPressed: () {
              setState(() {
                _isCalendarView = !_isCalendarView;
              });
            },
            tooltip: _isCalendarView ? 'Show History List' : 'Show Calendar',
          ),
          IconButton(
            icon: const Icon(Icons.time_to_leave_outlined, color: AppColors.primary),
            tooltip: 'Apply Leave',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ApplyLeaveScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: _isCalendarView
              ? Stack(
                  children: [
                    SingleChildScrollView(
                      padding: EdgeInsets.only(bottom: MediaQuery.of(context).size.height * 0.24),
                      child: Column(
                        children: [
                          _buildMonthSelector(),
                          _buildWeekdaysHeader(),
                          const SizedBox(height: 8),
                          _buildCalendarGrid(attendanceProvider),
                          const SizedBox(height: 12),
                          _buildLegend(),
                        ],
                      ),
                    ),
                    _buildDraggableDetailPanel(attendanceProvider),
                  ],
                )
              : RefreshIndicator(
                  color: AppColors.primary,
                  backgroundColor: AppColors.surface,
                  strokeWidth: 2.5,
                  onRefresh: () async => attendanceProvider.fetchHistory(),
                  child: attendanceProvider.isLoading ? const SkeletonList()
                      : attendanceProvider.attendanceHistory.isEmpty
                          ? ListView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              children: [
                                SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                                Center(
                                  child: Text(
                                    'No attendance logs recorded yet.',
                                    style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              physics: const AlwaysScrollableScrollPhysics(),
                              itemCount: attendanceProvider.attendanceHistory.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final log = attendanceProvider.attendanceHistory[index];
                                final dateStr = DateFormat('EEE, dd MMM yyyy').format(log.date);
                                final punchInStr = log.punchInTime != null
                                    ? DateFormat('hh:mm a').format(log.punchInTime!.toLocal())
                                    : '--:--';
                                final punchOutStr = log.punchOutTime != null
                                    ? DateFormat('hh:mm a').format(log.punchOutTime!.toLocal())
                                    : '--:--';

                                return StaggeredListItem(
                                  index: index,
                                  child: Container(
                                    decoration: AppTheme.cardDecoration,
                                    padding: const EdgeInsets.all(16.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              crossAxisAlignment: CrossAxisAlignment.center,
                                              children: [
                                                Text(
                                                  dateStr,
                                                  style: GoogleFonts.inter(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 14,
                                                    color: AppColors.textPrimary,
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.primarySoft,
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: Text(
                                                    'Session ${log.sessionNumber}',
                                                    style: GoogleFonts.inter(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: AppColors.primary,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            StatusBadge(status: log.status),
                                          ],
                                        ),
                                        const SizedBox(height: 16),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    'Punch In',
                                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    punchInStr,
                                                    style: GoogleFonts.inter(
                                                      fontSize: 13,
                                                      fontWeight: FontWeight.w600,
                                                      color: AppColors.textPrimary,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            Container(
                                              width: 1,
                                              height: 30,
                                              color: AppColors.border,
                                            ),
                                            const SizedBox(width: 12),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.center,
                                                children: [
                                                  Text(
                                                    'Punch Out',
                                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(
                                                    punchOutStr,
                                                    style: GoogleFonts.inter(
                                                      fontSize: 13,
                                                      fontWeight: FontWeight.w600,
                                                      color: AppColors.textPrimary,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            if (log.totalWorkingHours != null) ...[
                                              const SizedBox(width: 12),
                                              Container(
                                                width: 1,
                                                height: 30,
                                                color: AppColors.border,
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.center,
                                                  children: [
                                                    Text(
                                                      'Hours',
                                                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Text(
                                                      '${log.totalWorkingHours!.toStringAsFixed(1)}h',
                                                      style: GoogleFonts.inter(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.w600,
                                                        color: AppColors.primary,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
        ),
      ),
    );
  }
}

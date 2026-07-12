import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/alarm_service.dart';
import '../core/theme/app_theme.dart';

class AlarmSettingsScreen extends StatefulWidget {
  const AlarmSettingsScreen({super.key});

  @override
  State<AlarmSettingsScreen> createState() => _AlarmSettingsScreenState();
}

class _AlarmSettingsScreenState extends State<AlarmSettingsScreen> {
  bool _punchInEnabled = true;
  bool _punchOutEnabled = true;
  String _punchInTime = '09:00';
  String _punchOutTime = '18:00';
  String? _punchInTone;
  String? _punchOutTone;

  bool _dndGranted = false;
  bool _batteryIgnored = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkPermissions();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _punchInEnabled = prefs.getBool(AlarmService.prefPunchInEnabled) ?? true;
      _punchOutEnabled = prefs.getBool(AlarmService.prefPunchOutEnabled) ?? true;
      _punchInTime = prefs.getString(AlarmService.prefPunchInTime) ?? '09:00';
      _punchOutTime = prefs.getString(AlarmService.prefPunchOutTime) ?? '18:00';
      _punchInTone = prefs.getString(AlarmService.prefPunchInTone);
      _punchOutTone = prefs.getString(AlarmService.prefPunchOutTone);
    });
  }

  Future<void> _checkPermissions() async {
    final dnd = await AlarmService.isDndAccessGranted();
    final battery = await AlarmService.isBatteryOptimizationIgnored();
    setState(() {
      _dndGranted = dnd;
      _batteryIgnored = battery;
    });
  }

  Future<void> _saveToggle(String key, bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, value);
    await _syncAlarms();
  }

  Future<void> _selectTime(bool isPunchIn) async {
    final initialTimeStr = isPunchIn ? _punchInTime : _punchOutTime;
    final parts = initialTimeStr.split(':');
    final initialTime = TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));

    final picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final formattedTime = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
      final prefs = await SharedPreferences.getInstance();
      
      setState(() {
        if (isPunchIn) {
          _punchInTime = formattedTime;
          prefs.setString(AlarmService.prefPunchInTime, formattedTime);
        } else {
          _punchOutTime = formattedTime;
          prefs.setString(AlarmService.prefPunchOutTime, formattedTime);
        }
      });
      await _syncAlarms();
    }
  }

  Future<void> _pickTone(bool isPunchIn) async {
    final localPath = await AlarmService.pickCustomTone();
    if (localPath != null) {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        if (isPunchIn) {
          _punchInTone = localPath;
          prefs.setString(AlarmService.prefPunchInTone, localPath);
        } else {
          _punchOutTone = localPath;
          prefs.setString(AlarmService.prefPunchOutTone, localPath);
        }
      });
      await _syncAlarms();
    }
  }

  Future<void> _resetTone(bool isPunchIn) async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      if (isPunchIn) {
        _punchInTone = null;
        prefs.remove(AlarmService.prefPunchInTone);
      } else {
        _punchOutTone = null;
        prefs.remove(AlarmService.prefPunchOutTone);
      }
    });
    await _syncAlarms();
  }

  Future<void> _syncAlarms() async {
    await AlarmService.syncAlarms(_punchInTime, _punchOutTime);
  }

  String _getFileName(String? path) {
    if (path == null) return 'Default Alarm';
    try {
      final file = Uri.parse(path).pathSegments.last;
      return file;
    } catch (_) {
      return 'Custom Tone';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text(
          'Punch Alarm Settings',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(gradient: AppTheme.headerGradient),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Schedule exact alarm notifications to keep you synced with shift punching timings.',
              style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
            ),
            const SizedBox(height: 20),

            // PUNCH-IN ALARM CARD
            Container(
              decoration: AppTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.login_rounded, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Text(
                            'Punch-In Alarm',
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      Switch(
                        activeColor: AppColors.primary,
                        value: _punchInEnabled,
                        onChanged: (val) {
                          setState(() => _punchInEnabled = val);
                          _saveToggle(AlarmService.prefPunchInEnabled, val);
                        },
                      ),
                    ],
                  ),
                  if (_punchInEnabled) ...[
                    const Divider(height: 24),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Alarm Time', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
                      trailing: Text(
                        _punchInTime,
                        style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                      onTap: () => _selectTime(true),
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Alarm Sound', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
                      subtitle: Text(_getFileName(_punchInTone), style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_punchInTone != null)
                            IconButton(
                              icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                              onPressed: () => _resetTone(true),
                            ),
                          const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                        ],
                      ),
                      onTap: () => _pickTone(true),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // PUNCH-OUT ALARM CARD
            Container(
              decoration: AppTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.logout_rounded, color: AppColors.primary),
                          const SizedBox(width: 12),
                          Text(
                            'Punch-Out Alarm',
                            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      Switch(
                        activeColor: AppColors.primary,
                        value: _punchOutEnabled,
                        onChanged: (val) {
                          setState(() => _punchOutEnabled = val);
                          _saveToggle(AlarmService.prefPunchOutEnabled, val);
                        },
                      ),
                    ],
                  ),
                  if (_punchOutEnabled) ...[
                    const Divider(height: 24),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Alarm Time', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
                      trailing: Text(
                        _punchOutTime,
                        style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                      onTap: () => _selectTime(false),
                    ),
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Alarm Sound', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textSecondary)),
                      subtitle: Text(_getFileName(_punchOutTone), style: GoogleFonts.inter(fontSize: 12, color: AppColors.textTertiary)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_punchOutTone != null)
                            IconButton(
                              icon: const Icon(Icons.refresh_rounded, color: AppColors.textSecondary),
                              onPressed: () => _resetTone(false),
                            ),
                          const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                        ],
                      ),
                      onTap: () => _pickTone(false),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // PERMISSIONS FOR EXACT ALARMS
            Text(
              'Required Exemptions',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: AppTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Override Do Not Disturb (DND)', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    subtitle: Text(
                      'Allows the alarm ringtone to play audibly even when DND mode is turned on.',
                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: Switch(
                      activeColor: AppColors.primary,
                      value: _dndGranted,
                      onChanged: (val) async {
                        if (val) {
                          await AlarmService.requestDndAccess();
                          // Recheck policy status upon returning
                          await Future.delayed(const Duration(seconds: 1));
                          _checkPermissions();
                        }
                      },
                    ),
                  ),
                  const Divider(height: 24),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Exempt Battery Optimization', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    subtitle: Text(
                      'Exempts the app from aggressive OS background resource throttling to ensure exact alarms.',
                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: Icon(
                      _batteryIgnored ? Icons.check_circle : Icons.warning_amber_rounded,
                      color: _batteryIgnored ? AppColors.success : AppColors.error,
                    ),
                    onTap: () async {
                      if (!_batteryIgnored) {
                        final channel = MethodChannel('com.eazzio.payroll/device_settings');
                        await channel.invokeMethod('openBatteryOptimizationSettings');
                        await Future.delayed(const Duration(seconds: 1));
                        _checkPermissions();
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

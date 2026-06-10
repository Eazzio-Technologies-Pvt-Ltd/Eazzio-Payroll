import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ffms_mobile/main.dart';
import 'package:ffms_mobile/providers/auth_provider.dart';
import 'package:ffms_mobile/providers/task_provider.dart';
import 'package:ffms_mobile/providers/attendance_provider.dart';
import 'package:ffms_mobile/providers/leave_provider.dart';
import 'package:ffms_mobile/providers/expense_provider.dart';
import 'package:ffms_mobile/providers/notification_provider.dart';

void main() {
  testWidgets('App loads and mounts successfully', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => TaskProvider()),
          ChangeNotifierProvider(create: (_) => AttendanceProvider()),
          ChangeNotifierProvider(create: (_) => LeaveProvider()),
          ChangeNotifierProvider(create: (_) => ExpenseProvider()),
          ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ],
        child: const FFMSApp(),
      ),
    );

    // Evolve the splash timer by 2 seconds
    await tester.pump(const Duration(seconds: 2));
    // Pump another frame to finish transition/build
    await tester.pump();

    // Verify MaterialApp is loaded and contains MaterialApp widget
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}

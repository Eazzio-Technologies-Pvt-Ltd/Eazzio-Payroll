import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/utils/storage_helper.dart';

/// SocketService — maintains persistent WebSocket connection to the FFMS backend.
/// Receives real-time events emitted by the backend after admin actions.
/// Mobile app listens for:
///   - leave:status_updated   → refreshes leave list immediately
///   - expense:status_updated → refreshes expense list immediately
///   - notification:new       → shows in-app notification
///   - task:assigned          → shows task notification
class SocketService {
  static io.Socket? _socket;

  // Status update callbacks — wired to Provider.fetchXxx() in app init
  static void Function(dynamic)? onNewNotification;
  static void Function(dynamic)? onLeaveStatusUpdated;
  static void Function(dynamic)? onExpenseStatusUpdated;
  static void Function(dynamic)? onTaskAssigned;

  static io.Socket? get socket => _socket;

  static Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final token = await StorageHelper.getAccessToken();
    if (token == null) return;

    // Load server URL — strip /api/v1 to get base socket URL
    final serverUrl = dotenv.env['API_BASE_URL'] != null
        ? dotenv.env['API_BASE_URL']!.replaceAll('/api/v1', '')
        : 'http://localhost:5000';

    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(3000)
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      // ─── Persistent Notification ──────────────────────────────────
      _socket!.on('notification:new', (data) {
        if (onNewNotification != null) {
          onNewNotification!(data);
        }
      });

      // ─── Leave Status Update ───────────────────────────────────────
      // Emitted by leave.service.js after admin approves or rejects
      // Mobile fetches fresh leave list from API on receiving this event
      _socket!.on('leave:status_updated', (data) {
        if (onLeaveStatusUpdated != null) {
          onLeaveStatusUpdated!(data);
        }
      });

      // ─── Expense Status Update ────────────────────────────────────
      // Emitted by expense.service.js after admin approves or rejects
      // Mobile fetches fresh expense list from API on receiving this event
      _socket!.on('expense:status_updated', (data) {
        if (onExpenseStatusUpdated != null) {
          onExpenseStatusUpdated!(data);
        }
      });

      // ─── Task Assigned ─────────────────────────────────────────────
      // Emitted by task.service.js when a task is assigned to this user
      _socket!.on('task:assigned', (data) {
        if (onTaskAssigned != null) {
          onTaskAssigned!(data);
        }
      });
    });

    _socket!.onDisconnect((_) {
      // Socket disconnected — auto-reconnect handles reconnection
    });

    _socket!.onConnectError((err) {
      // Silent — reconnection strategy handles retry
    });
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}

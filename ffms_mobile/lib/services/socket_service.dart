import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/utils/storage_helper.dart';

class SocketService {
  static io.Socket? _socket;
  
  // Callbacks
  static void Function(dynamic)? onNewNotification;

  static io.Socket? get socket => _socket;

  static Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final token = await StorageHelper.getAccessToken();
    if (token == null) return;

    // Load server URL
    final serverUrl = dotenv.env['API_BASE_URL'] != null
        ? dotenv.env['API_BASE_URL']!.replaceAll('/api/v1', '')
        : 'http://localhost:5000';

    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      // Socket connected
      _socket!.on('notification:new', (data) {
        if (onNewNotification != null) {
          onNewNotification!(data);
        }
      });
    });

    _socket!.onDisconnect((_) {
      // Socket disconnected
    });
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}

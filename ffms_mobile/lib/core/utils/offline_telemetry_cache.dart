import 'dart:io';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';

/// Offline cache manager for GPS telemetry payloads.
/// Failed payloads are stored here when offline and retried automatically.
class OfflineTelemetryCache {
  static Future<File> _getFile() async {
    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/telemetry_cache.json');
  }

  /// Obfuscates the JSON string to prevent casual tampering.
  static String _encrypt(String data) {
    final bytes = utf8.encode(data);
    final b64 = base64Encode(bytes);
    return b64.split('').reversed.join('');
  }

  static String _decrypt(String data) {
    try {
      final b64 = data.split('').reversed.join('');
      final bytes = base64Decode(b64);
      return utf8.decode(bytes);
    } catch(e) {
      return '[]';
    }
  }

  /// Saves a telemetry payload to local cache.
  static Future<void> saveTelemetry(Map<String, dynamic> payload) async {
    try {
      final file = await _getFile();
      List<dynamic> list = [];
      if (await file.exists()) {
        final content = await file.readAsString();
        if (content.isNotEmpty) {
          list = jsonDecode(_decrypt(content));
        }
      }
      list.add(payload);
      // Keep only last 1000 items to prevent memory issues
      if (list.length > 1000) {
        list = list.sublist(list.length - 1000);
      }
      final jsonStr = jsonEncode(list);
      await file.writeAsString(_encrypt(jsonStr));
    } catch (e) {
      // Ignore write errors silently in background
    }
  }

  /// Retrieves all cached telemetry payloads.
  static Future<List<Map<String, dynamic>>> getAllTelemetry() async {
    try {
      final file = await _getFile();
      if (await file.exists()) {
        final content = await file.readAsString();
        if (content.isNotEmpty) {
          final decrypted = _decrypt(content);
          final List<dynamic> decoded = jsonDecode(decrypted);
          return decoded.cast<Map<String, dynamic>>();
        }
      }
    } catch (e) {
      return [];
    }
    return [];
  }

  /// Clears all cached telemetry payloads.
  static Future<void> clearTelemetry() async {
    try {
      final file = await _getFile();
      if (await file.exists()) {
        await file.writeAsString('[]');
      }
    } catch (e) {
      // Ignore
    }
  }
}

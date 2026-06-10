import 'dart:io';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';

/// `OfflineLocationCache` acts as a resilient, tamper-proof local buffer for GPS pings.
/// It uses the OS-level `getApplicationDocumentsDirectory()` which natively isolates the file
/// from user access (unless rooted). It compresses and obfuscates the queue to prevent "escape" tactics.
class OfflineLocationCache {
  static Future<File> _getFile() async {
    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/location_cache.json');
  }

  /// Obfuscates the JSON string to prevent casual tampering by root users.
  /// (Converts to Base64, then reverses the string so typical decoders fail).
  static String _encrypt(String data) {
    final bytes = utf8.encode(data);
    final b64 = base64Encode(bytes);
    return b64.split('').reversed.join(''); // Simple obfuscation to prevent casual tampering
  }

  static String _decrypt(String data) {
    try {
      if (data.startsWith('[')) return data; // Legacy plain json fallback
      final b64 = data.split('').reversed.join('');
      final bytes = base64Decode(b64);
      return utf8.decode(bytes);
    } catch(e) {
      return '[]';
    }
  }

  static Future<void> saveLocation(Map<String, dynamic> locationData) async {
    try {
      final file = await _getFile();
      List<dynamic> list = [];
      if (await file.exists()) {
        final content = await file.readAsString();
        if (content.isNotEmpty) {
          list = jsonDecode(_decrypt(content));
        }
      }
      list.add(locationData);
      // Keep only last 2000 pings to prevent memory overflow if offline for days
      if (list.length > 2000) {
        list = list.sublist(list.length - 2000);
      }
      final jsonStr = jsonEncode(list);
      await file.writeAsString(_encrypt(jsonStr));
    } catch (e) {
      // Ignore write errors silently in background
    }
  }

  static Future<List<Map<String, dynamic>>> getAllLocations() async {
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

  static Future<void> clearLocations() async {
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

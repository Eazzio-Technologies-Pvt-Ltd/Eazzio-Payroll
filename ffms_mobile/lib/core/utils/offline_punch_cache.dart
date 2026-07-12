import 'dart:io';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart';

/// `OfflinePunchCache` stores pending punch-in/punch-out data locally on the device.
/// This enables the "optimistic UI" pattern:
///   1. Selfie + GPS + timestamp are saved to local storage immediately.
///   2. The UI updates instantly (user sees "Punched In").
///   3. Background sync sends data to the backend with retry logic.
///   4. If all retries fail, the cache persists for next app launch sync.
///
/// File format: JSON array of pending punch records stored in app documents directory.
/// Each record contains: selfieFilePath, latitude, longitude, timestamp, type (in/out).
class OfflinePunchCache {
  static const String _fileName = 'pending_punches.json';

  static Future<File> _getFile() async {
    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}/$_fileName');
  }

  /// Save a pending punch-in record to local cache.
  /// [selfieFilePath] is the absolute path to the JPEG selfie on disk.
  /// [selfieBase64] is the base64-encoded selfie string (kept for API upload).
  static Future<void> savePendingPunchIn({
    required double latitude,
    required double longitude,
    required String timestamp,
    String? selfieFilePath,
    String? selfieBase64,
  }) async {
    try {
      final file = await _getFile();
      List<dynamic> list = await _readList(file);

      list.add({
        'type': 'punch_in',
        'latitude': latitude,
        'longitude': longitude,
        'timestamp': timestamp,
        'selfieFilePath': selfieFilePath,
        'selfieBase64': selfieBase64,
        'retryCount': 0,
        'createdAt': timestamp,
      });

      await file.writeAsString(jsonEncode(list));
      debugPrint('[OfflinePunchCache] Saved pending punch-in. Total pending: ${list.length}');
    } catch (e) {
      debugPrint('[OfflinePunchCache] Failed to save pending punch-in: $e');
    }
  }

  /// Save a pending punch-out record to local cache.
  static Future<void> savePendingPunchOut({
    required double latitude,
    required double longitude,
    required String timestamp,
    String? selfieBase64,
    String triggerType = 'MANUAL',
  }) async {
    try {
      final file = await _getFile();
      List<dynamic> list = await _readList(file);

      list.add({
        'type': 'punch_out',
        'latitude': latitude,
        'longitude': longitude,
        'timestamp': timestamp,
        'selfieBase64': selfieBase64,
        'triggerType': triggerType,
        'retryCount': 0,
        'createdAt': timestamp,
      });

      await file.writeAsString(jsonEncode(list));
      debugPrint('[OfflinePunchCache] Saved pending punch-out. Total pending: ${list.length}');
    } catch (e) {
      debugPrint('[OfflinePunchCache] Failed to save pending punch-out: $e');
    }
  }

  /// Retrieve all pending punch records.
  static Future<List<Map<String, dynamic>>> getPendingPunches() async {
    try {
      final file = await _getFile();
      final list = await _readList(file);
      return list.cast<Map<String, dynamic>>();
    } catch (e) {
      debugPrint('[OfflinePunchCache] Failed to read pending punches: $e');
      return [];
    }
  }

  /// Remove a specific pending punch by its createdAt timestamp (unique key).
  static Future<void> removePending(String createdAt) async {
    try {
      final file = await _getFile();
      List<dynamic> list = await _readList(file);
      list.removeWhere((item) => item['createdAt'] == createdAt);
      await file.writeAsString(jsonEncode(list));
      debugPrint('[OfflinePunchCache] Removed pending punch ($createdAt). Remaining: ${list.length}');
    } catch (e) {
      debugPrint('[OfflinePunchCache] Failed to remove pending punch: $e');
    }
  }

  /// Increment retry count for a specific pending punch.
  static Future<void> incrementRetry(String createdAt) async {
    try {
      final file = await _getFile();
      List<dynamic> list = await _readList(file);
      for (var item in list) {
        if (item['createdAt'] == createdAt) {
          item['retryCount'] = (item['retryCount'] ?? 0) + 1;
          break;
        }
      }
      await file.writeAsString(jsonEncode(list));
    } catch (e) {
      debugPrint('[OfflinePunchCache] Failed to increment retry: $e');
    }
  }

  /// Clear all pending punches (e.g. after successful full sync).
  static Future<void> clearAll() async {
    try {
      final file = await _getFile();
      if (await file.exists()) {
        await file.writeAsString('[]');
      }
    } catch (e) {
      debugPrint('[OfflinePunchCache] Failed to clear: $e');
    }
  }

  /// Check if there are any pending punches.
  static Future<bool> hasPending() async {
    final list = await getPendingPunches();
    return list.isNotEmpty;
  }

  // ─── Internal Helpers ─────────────────────────────────────────────
  static Future<List<dynamic>> _readList(File file) async {
    if (await file.exists()) {
      final content = await file.readAsString();
      if (content.isNotEmpty && content != '[]') {
        return jsonDecode(content) as List<dynamic>;
      }
    }
    return [];
  }
}

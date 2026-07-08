import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image/image.dart' as img;

/// Image upload result containing base64 data and local path info.
/// base64String always includes the `data:image/jpeg;base64,` prefix
/// so the backend Cloudinary uploader receives a valid data URI.
/// Backend handles all Cloudinary uploads — never call Cloudinary from mobile.
class ImageUploadResult {
  final String base64String;
  final String path;

  ImageUploadResult({
    required this.base64String,
    required this.path,
  });
}

/// Shared image utility — pick → compress (max 800×800px, q70, JPEG) → Base64
/// Images are sent as Base64 inside JSON payloads to the backend.
/// Backend uploads to Cloudinary and returns the secure_url.
/// Never call Cloudinary directly from mobile.
class ImageUploadUtil {
  /// Picks image from camera or gallery, compresses to max 800px / 70% quality,
  /// and returns base64 prefixed with `data:image/jpeg;base64,` for backend use.
  static Future<ImageUploadResult?> pickAndCompressImage(
    BuildContext context, {
    required bool cameraOnly,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    double? latitude,
    double? longitude,
    String? employeeName,
    String? employeeId,
  }) async {
    // 1. Request camera/gallery permissions before opening picker
    if (cameraOnly) {
      final cameraStatus = await Permission.camera.request();
      if (!cameraStatus.isGranted) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Camera permission is required to take photo.')),
          );
        }
        return null;
      }
    } else {
      final cameraStatus = await Permission.camera.request();
      final photosStatus = await Permission.photos.request();
      if (!cameraStatus.isGranted && !photosStatus.isGranted) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Camera or Photos permission is required.')),
          );
        }
        return null;
      }
    }

    // 2. Let user choose source (Camera or Gallery) if not cameraOnly
    ImageSource? selectedSource;
    if (cameraOnly) {
      selectedSource = ImageSource.camera;
    } else {
      if (!context.mounted) return null;
      selectedSource = await showModalBottomSheet<ImageSource>(
        context: context,
        builder: (modalContext) => SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera),
                title: const Text('Take Photo (Camera)'),
                onTap: () => Navigator.pop(modalContext, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from Gallery'),
                onTap: () => Navigator.pop(modalContext, ImageSource.gallery),
              ),
            ],
          ),
        ),
      );
    }

    if (selectedSource == null) return null;

    // 3. Open image picker — compress to 800px × 70% quality (keeps under 500KB typically)
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: selectedSource,
      preferredCameraDevice: preferredCameraDevice,
      maxWidth: 800,   // Max 800px width for network efficiency
      maxHeight: 800,  // Max 800px height for network efficiency
      imageQuality: 70, // 70% JPEG quality — good visual quality under 1MB
    );

    if (image == null) return null;

    if (!context.mounted) return null;
    return processPickedImage(
      context,
      image,
      latitude: latitude,
      longitude: longitude,
      employeeName: employeeName,
      employeeId: employeeId,
    );
  }

  /// Helper to validate size, format and encode picked XFile to base64 with data URI header.
  static Future<ImageUploadResult?> processPickedImage(
    BuildContext context,
    XFile image, {
    double? latitude,
    double? longitude,
    String? employeeName,
    String? employeeId,
  }) async {
    final pathLower = image.path.toLowerCase();
    final isValidFormat = pathLower.endsWith('.jpg') ||
                          pathLower.endsWith('.jpeg') ||
                          pathLower.endsWith('.png');

    if (!isValidFormat) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Invalid image format. Only JPG, JPEG, and PNG formats are allowed.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
      return null;
    }

    final File file = File(image.path);
    var bytes = await file.readAsBytes();

    // Apply Geo-Tag Watermark overlay if GPS coordinates are provided
    if (latitude != null && longitude != null) {
      try {
        final decoded = img.decodeImage(bytes);
        if (decoded != null) {
          final nowStr = DateTime.now().toLocal().toString().substring(0, 19);
          final nameText = employeeName ?? 'Unknown';
          final idText = employeeId ?? 'N/A';
          final text = 'Emp: $nameText ($idText)\nLoc: ${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}\nTime: $nowStr';

          // Semi-transparent dark strip at the bottom of the image for text contrast
          final rectHeight = 85;
          final rectY = decoded.height - rectHeight;
          img.fillRect(
            decoded,
            x1: 0,
            y1: rectY,
            x2: decoded.width,
            y2: decoded.height,
            color: img.ColorRgba8(0, 0, 0, 160),
          );

          final lines = text.split('\n');
          int currentY = rectY + 6;
          for (var line in lines) {
            img.drawString(
              decoded,
              line,
              font: img.arial24,
              x: 12,
              y: currentY,
              color: img.ColorRgba8(255, 255, 255, 255),
            );
            currentY += 24;
          }

          // Re-encode with 75% quality to keep file size under 500KB
          bytes = img.encodeJpg(decoded, quality: 75);
          await file.writeAsBytes(bytes);
        }
      } catch (e) {
        debugPrint('[ImageUploadUtil] Geo-tag watermarking failed: $e');
      }
    }

    final double fileSizeMb = bytes.length / (1024 * 1024);

    if (fileSizeMb > 1.5) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Image is too large (${fileSizeMb.toStringAsFixed(2)}MB). Max limit is 1.5MB.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
      return null;
    }

    final String rawBase64 = base64Encode(bytes);
    final String mimeType = pathLower.endsWith('.png') ? 'image/png' : 'image/jpeg';
    final String base64WithPrefix = 'data:$mimeType;base64,$rawBase64';

    return ImageUploadResult(
      base64String: base64WithPrefix,
      path: image.path,
    );
  }
}

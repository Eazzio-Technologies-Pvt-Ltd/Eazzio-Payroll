import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

/// Image upload result containing base64 data and local path info.
class ImageUploadResult {
  final String base64String;
  final String path;
  final String? url;

  ImageUploadResult({
    required this.base64String,
    required this.path,
    this.url,
  });
}

/// A single reusable image upload utility class.
class ImageUploadUtil {
  /// Prompts the user to pick an image, performs permission checks, compresses the image to < 1MB, 
  /// and returns an ImageUploadResult containing the base64 string, local path, and a simulated Cloudinary URL.
  static Future<ImageUploadResult?> pickAndCompressImage(
    BuildContext context, {
    required bool cameraOnly,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
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

    // 3. Open image picker with compression settings
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(
      source: selectedSource,
      preferredCameraDevice: preferredCameraDevice,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 40, // Drastically compresses JPEG quality to ensure file is under 1MB
    );

    if (image == null) return null;

    // 4. Client-side Format & Size Validation
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
    final bytes = await file.readAsBytes();
    final double fileSizeMb = bytes.length / (1024 * 1024);

    if (fileSizeMb > 1.0) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Image is too large (${fileSizeMb.toStringAsFixed(2)}MB). Max limit is 1MB.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
      return null;
    }

    // Convert to Base64
    final String base64String = base64Encode(bytes);

    // TODO: Backend API needed - Generic multipart image upload endpoint is missing on the backend.
    // Returning a simulated/mock Cloudinary URL along with the base64 data to remain compatible with base64 APIs.
    final String mockUrl = 'https://res.cloudinary.com/mock-cloud/image/upload/v12345/ffms/${image.name}';

    return ImageUploadResult(
      base64String: base64String,
      path: image.path,
      url: mockUrl,
    );
  }
}

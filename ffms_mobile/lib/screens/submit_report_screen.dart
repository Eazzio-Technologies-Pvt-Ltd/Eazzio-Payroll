// UI/UX v2 — modern premium design — Antigravity 2026
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/task_provider.dart';
import '../utils/image_upload_util.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/app_toast.dart';
import '../core/theme/app_theme.dart';

class SubmitReportScreen extends StatefulWidget {
  final String assignmentId;

  const SubmitReportScreen({super.key, required this.assignmentId});

  @override
  State<SubmitReportScreen> createState() => _SubmitReportScreenState();
}

class _SubmitReportScreenState extends State<SubmitReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();
  final _customerNameController = TextEditingController();
  final _customerPhoneController = TextEditingController();
  final _customerAddressController = TextEditingController();
  String _selectedVisitType = 'CLIENT_MEETING';
  File? _imageFile;
  bool _isSubmitting = false;

  final List<String> _visitTypes = [
    'CLIENT_MEETING',
    'SITE_VISIT',
    'DELIVERY',
    'COLLECTION',
    'OTHER',
  ];

  Future<void> _pickImage(ImageSource source) async {
    try {
      final result = await ImageUploadUtil.pickAndCompressImage(
        context,
        cameraOnly: source == ImageSource.camera,
      );

      if (result != null) {
        setState(() {
          _imageFile = File(result.path);
        });
      }
    } catch (e) {
      // Capture pick errors
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    
    final success = await taskProvider.submitVisitReport(
      assignmentId: widget.assignmentId,
      visitType: _selectedVisitType,
      notes: _notesController.text.trim(),
      customerName: _customerNameController.text.trim(),
      customerPhone: _customerPhoneController.text.trim(),
      customerAddress: _customerAddressController.text.trim(),
      attachment: _imageFile,
    );
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        AppToast.showSuccess(context, 'Visit report submitted successfully!');
        Navigator.pop(context); // back to details
      } else {
        AppToast.showError(context, 'Failed to submit report. Please try again.');
      }
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    _customerAddressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Submit Visit Report', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Core Form Card Container
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.03),
                      blurRadius: 20,
                      spreadRadius: 2,
                      offset: const Offset(0, 8),
                    ),
                  ],
                  border: Border.all(color: AppColors.outlineVariant, width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Customer details',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Customer Details
                    CustomTextField(
                      controller: _customerNameController,
                      label: 'Customer Name',
                      hint: 'Enter customer or contact name',
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Customer name is required';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _customerPhoneController,
                      label: 'Customer Phone (Optional)',
                      hint: 'Enter contact phone number',
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _customerAddressController,
                      label: 'Customer Address (Optional)',
                      hint: 'Enter site or client address',
                    ),
                    const SizedBox(height: 24),

                    Text(
                      'Visit Information',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Visit Type Dropdown
                    Text(
                      'Visit Type',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: AppColors.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedVisitType,
                      isExpanded: true,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppColors.outlineVariant),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppColors.outlineVariant),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                      dropdownColor: AppColors.surface,
                      items: _visitTypes.map((type) {
                        return DropdownMenuItem<String>(
                          value: type,
                          child: Text(
                            type.replaceAll('_', ' '),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedVisitType = val);
                        }
                      },
                    ),
                    const SizedBox(height: 20),

                    // Notes field
                    CustomTextField(
                      controller: _notesController,
                      label: 'Notes & Findings',
                      hint: 'Describe visit details, customer feedback, actions...',
                      maxLines: 4,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter some notes';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),

                    // Attachment Upload
                    Text(
                      'Attachment / Photo Proof',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: AppColors.onSurface,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.lightImpact();
                        showModalBottomSheet(
                          context: context,
                          backgroundColor: AppColors.surface,
                          shape: const RoundedRectangleBorder(
                            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                          ),
                          builder: (context) => SafeArea(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 20),
                              child: Wrap(
                                children: [
                                  ListTile(
                                    leading: Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.photo_camera_rounded, color: AppColors.primary),
                                    ),
                                    title: const Text('Take Photo', style: TextStyle(fontWeight: FontWeight.w600)),
                                    onTap: () {
                                      Navigator.pop(context);
                                      _pickImage(ImageSource.camera);
                                    },
                                  ),
                                  ListTile(
                                    leading: Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.photo_library_rounded, color: AppColors.primary),
                                    ),
                                    title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                                    onTap: () {
                                      Navigator.pop(context);
                                      _pickImage(ImageSource.gallery);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                      child: Container(
                        width: double.infinity,
                        height: 180,
                        decoration: BoxDecoration(
                          color: _imageFile != null ? AppColors.surface : AppColors.background,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _imageFile != null ? AppColors.primary.withOpacity(0.4) : AppColors.outlineVariant,
                          ),
                        ),
                        child: _imageFile != null
                            ? Stack(
                                fit: StackFit.expand,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(16),
                                    child: Image.file(_imageFile!, fit: BoxFit.cover),
                                  ),
                                  Positioned(
                                    right: 8,
                                    top: 8,
                                    child: GestureDetector(
                                      onTap: () {
                                        setState(() => _imageFile = null);
                                      },
                                      child: CircleAvatar(
                                        radius: 16,
                                        backgroundColor: Colors.black.withOpacity(0.6),
                                        child: const Icon(Icons.close_rounded, color: Colors.white, size: 16),
                                      ),
                                    ),
                                  )
                                ],
                              )
                            : const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.add_a_photo_outlined, size: 40, color: AppColors.primary),
                                  SizedBox(height: 8),
                                  Text(
                                    'Tap to upload a photo proof',
                                    style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13, fontWeight: FontWeight.w500),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Supports Camera or Gallery upload',
                                    style: TextStyle(color: AppColors.outline, fontSize: 11),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Submit Button
              CustomButton(
                text: 'Submit Visit Report',
                isLoading: _isSubmitting,
                onPressed: _handleSubmit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

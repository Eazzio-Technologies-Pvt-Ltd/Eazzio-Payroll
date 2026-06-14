// UI/UX v2 — modern premium design — Antigravity 2026
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/expense_provider.dart';
import '../utils/image_upload_util.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/app_toast.dart';
import '../core/theme/app_theme.dart';

class AddExpenseScreen extends StatefulWidget {
  const AddExpenseScreen({super.key});

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _amountController = TextEditingController();
  final _descController = TextEditingController();

  String _selectedCategory = 'FOOD'; // Travel claims moved to Home screen Distance Travel block (Task 2c)
  DateTime _selectedDate = DateTime.now();
  File? _receiptFile;
  bool _isSaving = false;

  final List<String> _categories = ['FOOD', 'LODGING', 'OTHER']; // Travel claims moved to Home screen Distance Travel block (Task 2c)

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.onSurface,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickReceipt(ImageSource source) async {
    try {
      final result = await ImageUploadUtil.pickAndCompressImage(
        context,
        cameraOnly: source == ImageSource.camera,
      );

      if (result != null) {
        setState(() => _receiptFile = File(result.path));
      }
    } catch (e) {
      // Capture pick errors
    }
  }

  Future<void> _handleSave({bool submitDirectly = false}) async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final expenseProvider = Provider.of<ExpenseProvider>(context, listen: false);

    final amount = double.tryParse(_amountController.text.trim()) ?? 0.0;

    final success = await expenseProvider.createExpense(
      title: _titleController.text.trim(),
      amount: amount,
      category: _selectedCategory,
      date: _selectedDate,
      description: _descController.text.trim(),
      receipt: _receiptFile,
      submitDirectly: submitDirectly,
    );
    setState(() => _isSaving = false);

    if (mounted) {
      if (success) {
        AppToast.showSuccess(
          context,
          submitDirectly ? 'Expense submitted successfully!' : 'Expense draft saved!',
        );
        Navigator.pop(context);
      } else {
        AppToast.showError(
          context,
          expenseProvider.errorMessage ?? 'Failed to file expense claim.',
        );
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    _descController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Add Expense', style: TextStyle(fontWeight: FontWeight.bold)),
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
                    // Title input
                    CustomTextField(
                      controller: _titleController,
                      label: 'Expense Claim Title',
                      hint: 'e.g. Lunch with Client / Office Supplies',
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter a title';
                        }
                        if (value.trim().length < 3) {
                          return 'Title must be at least 3 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),

                    // Category dropdown & Amount row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Category',
                                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface,
                                ),
                              ),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                value: _selectedCategory,
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
                                items: _categories.map((type) {
                                  return DropdownMenuItem<String>(
                                    value: type,
                                    child: Text(
                                      type,
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                                    ),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() => _selectedCategory = val);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: CustomTextField(
                            controller: _amountController,
                            label: 'Amount (\$)',
                            hint: '0.00',
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Enter amount';
                              }
                              if (double.tryParse(value) == null) {
                                return 'Enter valid number';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Date Picker
                    Text(
                      'Expense Date',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: _selectDate,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.outlineVariant),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded, color: AppColors.primary, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                DateFormat('dd MMM yyyy').format(_selectedDate),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.onSurface,
                                ),
                              ),
                            ),
                            const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.outline),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Description input
                    CustomTextField(
                      controller: _descController,
                      label: 'Description / Notes',
                      hint: 'Provide details about this transaction...',
                      maxLines: 2,
                    ),
                    const SizedBox(height: 20),

                    // Receipt Attachment Box
                    Text(
                      'Receipt Attachment / Photo Proof',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.onSurface,
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
                                    title: const Text('Capture Camera', style: TextStyle(fontWeight: FontWeight.w600)),
                                    onTap: () {
                                      Navigator.pop(context);
                                      _pickReceipt(ImageSource.camera);
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
                                    title: const Text('From Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                                    onTap: () {
                                      Navigator.pop(context);
                                      _pickReceipt(ImageSource.gallery);
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
                        height: 160,
                        decoration: BoxDecoration(
                          color: _receiptFile != null ? AppColors.surface : AppColors.background,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _receiptFile != null ? AppColors.primary.withOpacity(0.4) : AppColors.outlineVariant,
                          ),
                        ),
                        child: _receiptFile != null
                            ? Stack(
                                fit: StackFit.expand,
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(16),
                                    child: Image.file(_receiptFile!, fit: BoxFit.cover),
                                  ),
                                  Positioned(
                                    right: 8,
                                    top: 8,
                                    child: GestureDetector(
                                      onTap: () {
                                        setState(() => _receiptFile = null);
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
                                  Icon(Icons.receipt_long_outlined, size: 36, color: AppColors.primary),
                                  SizedBox(height: 8),
                                  Text(
                                    'Tap to attach receipt photo',
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

              // Form Action Buttons
              Row(
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'Save Draft',
                      isLoading: _isSaving,
                      onPressed: () => _handleSave(submitDirectly: false),
                      backgroundColor: AppColors.surface,
                      textColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CustomButton(
                      text: 'Submit Claim',
                      isLoading: _isSaving,
                      onPressed: () => _handleSave(submitDirectly: true),
                      backgroundColor: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/leave_provider.dart';
import '../models/leave_model.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../core/theme/app_theme.dart';

class ApplyLeaveScreen extends StatefulWidget {
  const ApplyLeaveScreen({super.key});

  @override
  State<ApplyLeaveScreen> createState() => _ApplyLeaveScreenState();
}

class _ApplyLeaveScreenState extends State<ApplyLeaveScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  
  String _selectedLeaveType = 'CASUAL';
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isSubmitting = false;
  String? _base64Image;

  final List<String> _leaveTypes = ['CASUAL', 'SICK', 'PLANNED', 'MATERNITY', 'PATERNITY'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<LeaveProvider>(context, listen: false).fetchBalances();
    });
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
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
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select leave dates'), backgroundColor: AppColors.error),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
    
    final success = await leaveProvider.applyLeave(
      leaveType: _selectedLeaveType,
      startDate: _startDate!,
      endDate: _endDate!,
      reason: _reasonController.text.trim(),
      attachmentBase64: _base64Image,
    );
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted successfully'), backgroundColor: AppColors.secondary),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(leaveProvider.errorMessage ?? 'Submission failed'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);

    // Try finding the selected balance
    final balance = leaveProvider.balances.firstWhere(
      (b) => b.leaveType == _selectedLeaveType,
      orElse: () => LeaveBalanceModel(
        id: '',
        userId: '',
        leaveType: _selectedLeaveType,
        totalEntitled: 0,
        totalUsed: 0,
        totalPending: 0,
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply Leave', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Leave Quota Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primaryContainer.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$_selectedLeaveType QUOTA DETAILS',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildQuotaStat('Entitled', balance.totalEntitled),
                        _buildQuotaStat('Used', balance.totalUsed),
                        _buildQuotaStat('Pending', balance.totalPending),
                        _buildQuotaStat('Available', balance.available, highlight: true),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Leave Type Select
              Text(
                'Leave Type',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedLeaveType,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: AppColors.surface,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.outlineVariant),
                  ),
                ),
                items: _leaveTypes.map((type) {
                  return DropdownMenuItem<String>(
                    value: type,
                    child: Text(type),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedLeaveType = val);
                  }
                },
              ),
              const SizedBox(height: 20),

              // Date range selector
              Text(
                'Leave Duration',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: _selectDateRange,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.outlineVariant),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _startDate == null
                            ? 'Select start and end dates'
                            : '${DateFormat('dd MMM').format(_startDate!)} - ${DateFormat('dd MMM yyyy').format(_endDate!)}',
                        style: TextStyle(
                          color: _startDate == null ? AppColors.outline : AppColors.onSurface,
                          fontSize: 14,
                        ),
                      ),
                      const Icon(Icons.date_range_outlined, color: AppColors.outline),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Reason
              CustomTextField(
                controller: _reasonController,
                label: 'Reason',
                hint: 'Provide reason details...',
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please state a reason';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // Attachment
              Text(
                'Attachment / Medical Proof',
                style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: () async {
                  final picker = ImagePicker();
                  final XFile? image = await picker.pickImage(
                    source: ImageSource.camera,
                    imageQuality: 30, // Extremely compressed
                    maxWidth: 800,
                    maxHeight: 800,
                  );
                  if (image != null) {
                    final bytes = await image.readAsBytes();
                    setState(() => _base64Image = base64Encode(bytes));
                  }
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.outlineVariant),
                  ),
                  child: Column(
                    children: [
                      if (_base64Image != null) ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(base64Decode(_base64Image!), height: 100, fit: BoxFit.cover),
                        ),
                        const SizedBox(height: 12),
                        const Text('Attachment Added (Tap to retake)', style: TextStyle(color: AppColors.primary, fontSize: 12)),
                      ] else ...[
                        const Icon(Icons.camera_alt, color: AppColors.outline, size: 32),
                        const SizedBox(height: 8),
                        const Text('Tap to capture document', style: TextStyle(color: AppColors.outline, fontSize: 14)),
                      ]
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // Submit Button
              CustomButton(
                text: 'Save / Apply Leave',
                isLoading: _isSubmitting,
                onPressed: _handleSubmit,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuotaStat(String label, int val, {bool highlight = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, color: AppColors.outline, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 4),
        Text(
          '$val',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: highlight ? AppColors.primary : AppColors.onSurface,
          ),
        ),
      ],
    );
  }
}

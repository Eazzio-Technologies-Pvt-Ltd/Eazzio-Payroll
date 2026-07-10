import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/leave_provider.dart';
import '../models/leave_model.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/app_toast.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/responsive.dart'; // Responsive helper — no hardcoded sizes

// Apply leave screen v2 — modern balance badges + structured container + gradient submission
class ApplyLeaveScreen extends StatefulWidget {
  const ApplyLeaveScreen({super.key});

  @override
  State<ApplyLeaveScreen> createState() => _ApplyLeaveScreenState();
}

class _ApplyLeaveScreenState extends State<ApplyLeaveScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  
  String _selectedLeaveType = 'CASUAL';
  DateTime? _startDate;
  DateTime? _endDate;
  bool _isSubmitting = false;
  String? _base64Image;

  final List<String> _leaveTypes = ['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER'];

  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    ));
    _animController.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<LeaveProvider>(context, listen: false).fetchBalances();
    });
  }

  Future<void> _selectStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _startDate = picked;
        if (_endDate == null || _endDate!.isBefore(picked)) {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _selectEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? _startDate ?? DateTime.now(),
      firstDate: _startDate ?? DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _endDate = picked;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (_startDate == null || _endDate == null) {
      AppToast.showError(context, 'Please select leave dates');
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
        AppToast.showSuccess(context, 'Leave request submitted successfully');
        Navigator.pop(context);
      } else {
        AppToast.showError(context, leaveProvider.errorMessage ?? 'Submission failed');
      }
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);

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
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text('Apply Leave', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: SingleChildScrollView(
            // Responsive padding — no hardcoded values
            padding: EdgeInsets.all(Responsive(context).cardPadding),
            child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Leave Quota Box (Premium Badge Group)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: AppTheme.cardDecoration,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$_selectedLeaveType QUOTA BALANCE',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Row uses Expanded to prevent right overflow on small screens
                    Row(
                      children: [
                        Expanded(child: _buildQuotaStat('Entitled', balance.totalEntitled)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildQuotaStat('Used', balance.totalUsed)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildQuotaStat('Pending', balance.totalPending)),
                        const SizedBox(width: 8),
                        Expanded(child: _buildQuotaStat('Available', balance.available, highlight: true)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Form Input Card Container
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppTheme.cardDecoration,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Leave Type Select
                    Text(
                      'Leave Type',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedLeaveType,
                      isExpanded: true, // isExpanded:true on dropdown prevents overflow
                      decoration: modernInputDecoration(hint: 'Select Leave Type'),
                      dropdownColor: AppColors.surface,
                      items: _leaveTypes.map((type) {
                        return DropdownMenuItem<String>(
                          value: type,
                          child: Text(
                            type,
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedLeaveType = val);
                        }
                      },
                    ),
                    const SizedBox(height: 20),

                    // Date range selectors (Start & End)
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Start Date',
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: _selectStartDate,
                                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: AppColors.bgInput,
                                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.calendar_today_rounded, color: AppColors.primary, size: 16),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _startDate == null
                                              ? 'Select'
                                              : DateFormat('dd MMM yyyy').format(_startDate!),
                                          style: GoogleFonts.inter(
                                            color: _startDate == null ? AppColors.textTertiary : AppColors.textPrimary,
                                            fontSize: 13,
                                            fontWeight: _startDate == null ? FontWeight.normal : FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'End Date',
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              InkWell(
                                onTap: _startDate == null ? null : _selectEndDate,
                                borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                  decoration: BoxDecoration(
                                    color: _startDate == null ? AppColors.bgPage : AppColors.bgInput,
                                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.calendar_today_rounded, 
                                        color: _startDate == null ? AppColors.textTertiary : AppColors.primary, 
                                        size: 16,
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          _endDate == null
                                              ? 'Select'
                                              : DateFormat('dd MMM yyyy').format(_endDate!),
                                          style: GoogleFonts.inter(
                                            color: _endDate == null ? AppColors.textTertiary : AppColors.textPrimary,
                                            fontSize: 13,
                                            fontWeight: _endDate == null ? FontWeight.normal : FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Reason
                    CustomTextField(
                      controller: _reasonController,
                      label: 'Reason / Description',
                      hint: 'Provide reason details for approval...',
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
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final picker = ImagePicker();
                        final XFile? image = await picker.pickImage(
                          source: ImageSource.camera,
                          imageQuality: 30,
                          maxWidth: 800,
                          maxHeight: 800,
                        );
                        if (image != null) {
                          final bytes = await image.readAsBytes();
                          setState(() => _base64Image = base64Encode(bytes));
                        }
                      },
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
                        decoration: BoxDecoration(
                          color: _base64Image != null ? AppColors.successSoft : AppColors.bgInput,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          border: Border.all(
                            color: _base64Image != null ? AppColors.success.withOpacity(0.4) : AppColors.border,
                          ),
                        ),
                        child: Column(
                          children: [
                            if (_base64Image != null) ...[
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.memory(base64Decode(_base64Image!), height: 120, width: 120, fit: BoxFit.cover),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 16),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Document Attached (Tap to retake)',
                                    style: GoogleFonts.inter(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ] else ...[
                              const Icon(Icons.add_photo_alternate_outlined, color: AppColors.primary, size: 36),
                              const SizedBox(height: 8),
                              Text(
                                'Tap to capture proof document',
                                style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Camera capture only (Max size 5MB)',
                                style: GoogleFonts.inter(color: AppColors.textTertiary, fontSize: 11),
                              ),
                            ]
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              CustomButton(
                text: 'Save & Submit Leave Request',
                isLoading: _isSubmitting,
                onPressed: _handleSubmit,
              ),
            ],
          ),
        ),
      ),
    ),
    ),
    );
  }

  Widget _buildQuotaStat(String label, int val, {bool highlight = false}) {
    // Container fills Expanded parent — no fixed horizontal padding to avoid overflow
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
      decoration: BoxDecoration(
        color: highlight ? AppColors.primarySoft : AppColors.bgInput,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: highlight ? AppColors.primary.withOpacity(0.2) : AppColors.border,
        ),
      ),
      child: Column(
        children: [
          // Label — overflow ellipsis guards against very long labels
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 9,
              color: highlight ? AppColors.primary : AppColors.textSecondary,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.2,
            ),
            overflow: TextOverflow.ellipsis,
            maxLines: 1,
          ),
          const SizedBox(height: 6),
          Text(
            '$val',
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: highlight ? AppColors.primary : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

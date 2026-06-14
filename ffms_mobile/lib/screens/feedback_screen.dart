// UI/UX v2 — modern premium design — Antigravity 2026
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/feedback_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/custom_button.dart';
import '../widgets/app_toast.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _formKey = GlobalKey<FormState>();
  String _category = 'WORK_ENVIRONMENT';
  final TextEditingController _contentController = TextEditingController();
  int _rating = 5;

  final List<String> _categories = [
    'WORK_ENVIRONMENT',
    'MANAGEMENT',
    'TOOLS_AND_EQUIPMENT',
    'COMPENSATION',
    'OTHER'
  ];

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _submitFeedback() async {
    if (!_formKey.currentState!.validate()) return;
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final feedbackProvider = Provider.of<FeedbackProvider>(context, listen: false);
    
    final orgId = authProvider.currentUser?.organization?.id;
    if (orgId == null) {
      AppToast.showError(context, 'Error: No Organization ID found');
      return;
    }

    final success = await feedbackProvider.submitFeedback(
      category: _category,
      content: _contentController.text,
      rating: _rating,
      organizationId: orgId,
    );

    if (success && mounted) {
      AppToast.showSuccess(context, 'Anonymous feedback submitted successfully');
      Navigator.pop(context);
    } else if (mounted) {
      AppToast.showError(context, feedbackProvider.errorMessage ?? 'Submission failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Anonymous Feedback', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        centerTitle: false,
      ),
      body: Consumer<FeedbackProvider>(
        builder: (context, provider, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header description card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.primary.withOpacity(0.15)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.security_outlined, color: AppColors.primary, size: 24),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'Your feedback is 100% anonymous. We value your honest opinion to improve the workplace.',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppColors.onPrimaryContainer,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

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
                          'Category',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _category,
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
                          items: _categories.map((c) {
                            return DropdownMenuItem(
                              value: c,
                              child: Text(
                                c.replaceAll('_', ' '),
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _category = val);
                          },
                        ),
                        const SizedBox(height: 24),

                        Text(
                          'Rating',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Premium rating stars container
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.outlineVariant),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: List.generate(5, (index) {
                              int starValue = index + 1;
                              final isSelected = starValue <= _rating;
                              return InkWell(
                                borderRadius: BorderRadius.circular(24),
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  setState(() => _rating = starValue);
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  padding: const EdgeInsets.all(8),
                                  child: Icon(
                                    isSelected ? Icons.star_rounded : Icons.star_outline_rounded,
                                    color: isSelected ? Colors.amber : AppColors.outline,
                                    size: 38,
                                  ),
                                ),
                              );
                            }),
                          ),
                        ),
                        const SizedBox(height: 24),

                        Text(
                          'Feedback Message',
                          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _contentController,
                          maxLines: 5,
                          decoration: InputDecoration(
                            hintText: 'Share your thoughts, concerns, or suggestions...',
                            filled: true,
                            fillColor: AppColors.background,
                            contentPadding: const EdgeInsets.all(16),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: AppColors.outlineVariant),
                            ),
                          ),
                          style: const TextStyle(fontSize: 14),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Please enter your feedback';
                            }
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  CustomButton(
                    text: 'Submit Anonymously',
                    isLoading: provider.isLoading,
                    onPressed: _submitFeedback,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

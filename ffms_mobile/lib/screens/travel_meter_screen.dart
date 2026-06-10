import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/travel_provider.dart';
import '../utils/image_upload_util.dart';
import '../core/theme/app_theme.dart';

class TravelMeterScreen extends StatefulWidget {
  const TravelMeterScreen({super.key});

  @override
  State<TravelMeterScreen> createState() => _TravelMeterScreenState();
}

class _TravelMeterScreenState extends State<TravelMeterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _startController = TextEditingController();
  final _endController = TextEditingController();
  final _notesController = TextEditingController();
  String? _proofBase64;
  bool _isPicking = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final tp = Provider.of<TravelProvider>(context, listen: false);
      await tp.fetchTodayTravel();
      if (mounted) {
        final today = tp.todayLog;
        if (today != null) {
          if (today.meterStart != null) {
            _startController.text = today.meterStart!.toStringAsFixed(0);
          }
          if (today.meterEnd != null) {
            _endController.text = today.meterEnd!.toStringAsFixed(0);
          }
          if (today.notes != null) {
            _notesController.text = today.notes!;
          }
        }
        tp.fetchTravelHistory(limit: 7);
      }
    });
  }

  @override
  void dispose() {
    _startController.dispose();
    _endController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickMeterPhoto() async {
    setState(() => _isPicking = true);
    try {
      // Reusable image upload utility: checks camera/gallery permission, lets user choose, formats/sizes under 1MB
      final result = await ImageUploadUtil.pickAndCompressImage(
        context,
        cameraOnly: false,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (result != null) {
        setState(() => _proofBase64 = result.base64String);
      }
    } finally {
      setState(() => _isPicking = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final start = double.tryParse(_startController.text.trim()) ?? 0;
    final end = double.tryParse(_endController.text.trim()) ?? 0;

    final tp = Provider.of<TravelProvider>(context, listen: false);
    final today = tp.todayLog;

    // Validation checks depending on what we are submitting
    if (today != null && today.meterStart != null) {
      // We are completing/submitting end meter
      if (end <= today.meterStart!) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('End meter reading must be greater than start reading (${today.meterStart!.toStringAsFixed(0)} KM)'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
    } else {
      // We are logging start meter (or both)
      if (_endController.text.isNotEmpty && end <= start) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('End meter reading must be greater than start reading'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
    }

    if (_proofBase64 == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(today != null && today.meterStart != null
              ? 'Please upload end meter proof photo'
              : 'Please upload start meter proof photo'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final success = await tp.submitTravelLog(
      meterStart: (today == null || today.meterStart == null) ? start : null,
      meterEnd: _endController.text.isNotEmpty ? end : null,
      proofImageBase64: _proofBase64,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
    );

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Travel log submitted successfully!'),
            backgroundColor: AppColors.secondary,
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(tp.errorMessage ?? 'Failed to submit travel log'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tp = Provider.of<TravelProvider>(context);
    final today = tp.todayLog;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Travel Meter', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Today's Summary Card
            if (today != null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Distance Travelled Today',
                      style: TextStyle(color: Colors.white70, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${today.totalDistanceKm.toStringAsFixed(1)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 40,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Padding(
                          padding: EdgeInsets.only(bottom: 6),
                          child: Text('KM', style: TextStyle(color: Colors.white70, fontSize: 16)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.currency_rupee, color: Colors.white70, size: 18),
                        Text(
                          'Travel Allowance: ₹${today.allowanceAmount.toStringAsFixed(0)}',
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    if (today.meterStart != null && today.meterEnd != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Odometer: ${today.meterStart!.toStringAsFixed(0)} → ${today.meterEnd!.toStringAsFixed(0)} KM',
                        style: const TextStyle(color: Colors.white60, fontSize: 12),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Meter Reading Form
            Text(
              today != null ? 'Update Today\'s Reading' : 'Enter Today\'s Meter Reading',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 4),
            Text(
              '₹4 per KM travel allowance',
              style: const TextStyle(fontSize: 12, color: AppColors.outline),
            ),
            const SizedBox(height: 16),

            Form(
              key: _formKey,
              child: Column(
                children: [
                  TextFormField(
                    controller: _startController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    enabled: today == null || today.meterStart == null,
                    decoration: InputDecoration(
                      labelText: 'Start Meter Reading (KM)',
                      hintText: 'e.g. 12500',
                      prefixIcon: const Icon(Icons.speed_outlined),
                      fillColor: (today != null && today.meterStart != null) ? Colors.grey[200] : Colors.transparent,
                      filled: (today != null && today.meterStart != null),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Start reading is required';
                      if (double.tryParse(v.trim()) == null) return 'Enter a valid number';
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _endController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    enabled: today == null || today.meterEnd == null,
                    decoration: InputDecoration(
                      labelText: 'End Meter Reading (KM)',
                      hintText: 'e.g. 12513',
                      prefixIcon: const Icon(Icons.speed),
                      fillColor: (today != null && today.meterEnd != null) ? Colors.grey[200] : Colors.transparent,
                      filled: (today != null && today.meterEnd != null),
                    ),
                    validator: (v) {
                      if (today != null && today.meterStart != null) {
                        // When completing travel, end meter is required
                        if (v == null || v.trim().isEmpty) return 'End reading is required';
                        if (double.tryParse(v.trim()) == null) return 'Enter a valid number';
                      } else {
                        // When logging start, end meter is optional
                        if (v != null && v.trim().isNotEmpty) {
                          if (double.tryParse(v.trim()) == null) return 'Enter a valid number';
                        }
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Distance Preview
                  if (_startController.text.isNotEmpty && _endController.text.isNotEmpty)
                    AnimatedBuilder(
                      animation: Listenable.merge([_startController, _endController]),
                      builder: (context, _) {
                        final s = double.tryParse(_startController.text) ?? 0;
                        final e = double.tryParse(_endController.text) ?? 0;
                        final dist = (e - s).clamp(0, double.infinity);
                        final allowance = dist * 4;
                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _SummaryChip(label: 'Distance', value: '${dist.toStringAsFixed(1)} KM'),
                              _SummaryChip(label: 'Allowance', value: '₹${allowance.toStringAsFixed(0)}'),
                            ],
                          ),
                        );
                      },
                    ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _notesController,
                    enabled: today == null || today.meterEnd == null,
                    decoration: const InputDecoration(
                      labelText: 'Notes (Optional)',
                      hintText: 'e.g. Client visits in Jamshedpur East Zone',
                      prefixIcon: Icon(Icons.notes_outlined),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),

                  // Meter Photo Upload
                  if (!(today != null && today.meterStart != null && today.meterEnd != null))
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: Icon(
                              _proofBase64 != null ? Icons.check_circle : Icons.camera_alt_outlined,
                              color: _proofBase64 != null ? AppColors.secondary : AppColors.primary,
                            ),
                            label: Text(
                              _proofBase64 != null 
                                  ? 'Photo Captured ✓' 
                                  : (today != null && today.meterStart != null ? 'Upload End Meter Photo' : 'Upload Start Meter Photo'),
                              style: TextStyle(
                                color: _proofBase64 != null ? AppColors.secondary : AppColors.primary,
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 48),
                              side: BorderSide(
                                color: _proofBase64 != null ? AppColors.secondary : AppColors.primary,
                              ),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isPicking ? null : _pickMeterPhoto,
                          ),
                        ),
                        if (_proofBase64 != null) ...[
                          const SizedBox(width: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.memory(
                              base64Decode(_proofBase64!),
                              height: 48,
                              width: 48,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ],
                      ],
                    ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: (tp.isSubmitting || (today != null && today.meterStart != null && today.meterEnd != null)) ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 52),
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: tp.isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              today != null && today.meterStart != null && today.meterEnd == null
                                  ? 'Complete Travel Log'
                                  : (today != null && today.meterStart != null && today.meterEnd != null
                                      ? 'Travel Log Completed'
                                      : 'Submit Travel Log'),
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Travel History Section
            Text('Travel History', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),

            if (tp.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (tp.history.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.outlineVariant),
                ),
                child: const Center(
                  child: Text('No travel history yet.', style: TextStyle(color: AppColors.outline)),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: tp.history.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final log = tp.history[index];
                  final dateStr = DateFormat('dd MMM').format(log.date.toLocal());
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.directions_car_outlined, color: AppColors.primary),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(dateStr, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                const SizedBox(height: 2),
                                Text(
                                  '${log.totalDistanceKm.toStringAsFixed(1)} KM',
                                  style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '₹${log.allowanceAmount.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                  color: AppColors.secondary,
                                ),
                              ),
                              const Text('allowance', style: TextStyle(fontSize: 11, color: AppColors.outline)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.primary)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.onPrimaryContainer,
          ),
        ),
      ],
    );
  }
}

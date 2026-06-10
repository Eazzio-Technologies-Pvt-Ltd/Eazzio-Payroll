import 'package:flutter/material.dart';
import '../services/api_service.dart';

class FeedbackProvider extends ChangeNotifier {
  bool _isLoading = false;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<bool> submitFeedback({
    required String category,
    required String content,
    int? rating,
    required String organizationId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.post(
        '/feedback/submit',
        data: {
          'category': category,
          'content': content,
          'rating': rating,
          'organizationId': organizationId,
        },
      );

      if (response.data['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.data['error']?['message'] ?? 'Failed to submit feedback';
      }
    } catch (e) {
      _errorMessage = 'Network error occurred: $e';
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}

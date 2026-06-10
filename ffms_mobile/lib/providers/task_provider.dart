import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../models/task_model.dart';
import '../models/user_model.dart';

class TaskProvider extends ChangeNotifier {
  List<TaskModel> _tasks = [];
  List<TaskModel> _personalTasks = []; // Personal tasks saved locally first, synced to backend when online
  bool _isLoading = false;
  String? _errorMessage;

  List<TaskModel> get tasks => [..._tasks, ..._personalTasks];
  List<TaskModel> get personalTasks => _personalTasks;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Fetch tasks (assigned to me or created by me)
  Future<void> fetchMyTasks({String? status, String? type = 'assigned'}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final queryParams = <String, dynamic>{'type': type};
      if (status != null && status != 'ALL') {
        queryParams['status'] = status;
      }

      final response = await ApiService.client.get(
        '/tasks/my',
        queryParameters: queryParams,
      );

      if (response.data['success'] == true) {
        final list = response.data['data']['tasks'] as List? ?? [];
        _tasks = list.map((t) => TaskModel.fromJson(t as Map<String, dynamic>)).toList();
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to load tasks';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch a single task by ID
  Future<TaskModel?> fetchTaskById(String taskId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.get('/tasks/$taskId');
      if (response.data['success'] == true) {
        final taskData = response.data['data'];
        final task = TaskModel.fromJson(taskData as Map<String, dynamic>);
        // Update local list if exists, else append
        final index = _tasks.indexWhere((t) => t.id == taskId);
        if (index != -1) {
          _tasks[index] = task;
        } else {
          _tasks.add(task);
        }
        notifyListeners();
        return task;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to fetch task';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return null;
  }

  // Update Assignment Status (e.g. START_TASK, COMPLETE_TASK)
  Future<bool> updateAssignmentStatus(
    String taskId, 
    String assignmentId, 
    String status, {
    String? completionNote,
    List<String>? completionImages,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = <String, dynamic>{'status': status};
      if (completionNote != null) data['completionNote'] = completionNote;
      if (completionImages != null && completionImages.isNotEmpty) data['completionImages'] = completionImages;

      final response = await ApiService.client.patch(
        '/tasks/$taskId/assignments/$assignmentId',
        data: data,
      );

      if (response.data['success'] == true) {
        // Refresh local tasks
        await fetchMyTasks();
        return true;
      }
    } on DioException catch (e) {
      debugPrint('[TaskProvider] DioException in updateAssignmentStatus: ${e.response?.statusCode} - ${e.response?.data}');
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to update status';
    } catch (e) {
      debugPrint('[TaskProvider] Unexpected error in updateAssignmentStatus: $e');
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  // Submit Visit Report (with optional attachment file upload)
  Future<bool> submitVisitReport({
    required String assignmentId,
    required String visitType,
    required String notes,
    required String customerName,
    String? customerPhone,
    String? customerAddress,
    File? attachment,
  }) async {
    try {
      List<String> base64Images = [];
      if (attachment != null) {
        final bytes = await attachment.readAsBytes();
        final base64Str = base64.encode(bytes);
        base64Images.add(base64Str);
      }

      final response = await ApiService.client.post(
        '/visits',
        data: {
          'taskAssignmentId': assignmentId,
          'visitType': visitType,
          'notes': notes,
          'customerName': customerName,
          'customerPhone': customerPhone ?? '',
          'customerAddress': customerAddress ?? '',
          'images': base64Images,
        },
      );

      if (response.data['success'] == true) {
        await fetchMyTasks();
        return true;
      }
    } catch (e) {
      // Catch errors
    }
    return false;
  }

  // Get Task Comments
  Future<List<CommentModel>> getComments(String taskId) async {
    try {
      final response = await ApiService.client.get('/tasks/$taskId/comments');
      if (response.data['success'] == true) {
        final list = response.data['data']['comments'] as List? ?? [];
        return list.map((c) => CommentModel.fromJson(c as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      // Catch
    }
    return [];
  }

  // Add Comment
  Future<bool> addComment(String taskId, String content) async {
    try {
      final response = await ApiService.client.post(
        '/tasks/$taskId/comments',
        data: {'content': content},
      );
      return response.data['success'] == true;
    } catch (e) {
      return false;
    }
  }

  // Create Task (own task or for employee)
  Future<bool> createTask({
    required String title,
    String? description,
    String priority = 'MEDIUM',
    DateTime? dueDate,
    required List<String> assigneeIds,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.post(
        '/tasks',
        data: {
          'title': title,
          if (description != null && description.isNotEmpty) 'description': description,
          'priority': priority,
          if (dueDate != null) 'dueDate': dueDate.toUtc().toIso8601String(),
          'assigneeIds': assigneeIds,
        },
      );

      if (response.data['success'] == true) {
        await fetchMyTasks();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to create task';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  // Fetch all employees in same org (for assignment selection)
  Future<List<UserModel>> fetchAvailableEmployees() async {
    try {
      final response = await ApiService.client.get('/users');
      if (response.data['success'] == true) {
        final list = response.data['data']['users'] as List? ?? [];
        return list.map((u) => UserModel.fromJson(u as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  // ─── Personal Task (Private To-Do) ───────────────────────────────────────────
  // is_personal flag tells backend to hide this from admin/manager
  // Personal tasks saved locally first, synced to backend when online

  static const String _personalTasksKey = 'personal_tasks_queue';

  /// Create a personal task — attempt backend POST first, fallback to local storage
  Future<bool> createPersonalTask({
    required String title,
    String? notes,
    DateTime? dueDate,
    required String userId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final taskPayload = <String, dynamic>{
      'title': title,
      if (notes != null && notes.isNotEmpty) 'description': notes,
      'priority': 'MEDIUM',
      if (dueDate != null) 'dueDate': dueDate.toUtc().toIso8601String(),
      'assigneeIds': [userId],
      // TODO: Backend API needed — isPersonal flag for personal task support
      'isPersonal': true,
    };

    try {
      // Attempt to POST to backend
      final response = await ApiService.client.post('/tasks', data: taskPayload);
      if (response.data['success'] == true) {
        await fetchMyTasks();
        return true;
      }
    } on DioException catch (_) {
      // Network or backend failure — save locally for later sync
      await _savePersonalTaskLocally(taskPayload);
      _addLocalPersonalTask(taskPayload, userId);
      return true;
    } catch (_) {
      await _savePersonalTaskLocally(taskPayload);
      _addLocalPersonalTask(taskPayload, userId);
      return true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  /// Save a personal task payload to SharedPreferences queue for later sync
  Future<void> _savePersonalTaskLocally(Map<String, dynamic> payload) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existing = prefs.getStringList(_personalTasksKey) ?? [];
      existing.add(json.encode(payload));
      await prefs.setStringList(_personalTasksKey, existing);
    } catch (_) {}
  }

  /// Add a local personal task model to the in-memory list for display
  void _addLocalPersonalTask(Map<String, dynamic> payload, String userId) {
    final localTask = TaskModel(
      id: 'local_${DateTime.now().millisecondsSinceEpoch}',
      title: payload['title'] as String,
      description: payload['description'] as String?,
      priority: payload['priority'] as String? ?? 'MEDIUM',
      status: 'PENDING',
      dueDate: payload['dueDate'] != null ? DateTime.tryParse(payload['dueDate'] as String) : null,
      createdAt: DateTime.now(),
      assignments: [],
      isPersonal: true,
    );
    _personalTasks.add(localTask);
    notifyListeners();
  }

  /// Load personal tasks from SharedPreferences at startup
  Future<void> loadLocalPersonalTasks(String userId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existing = prefs.getStringList(_personalTasksKey) ?? [];
      _personalTasks = existing.map((jsonStr) {
        final payload = json.decode(jsonStr) as Map<String, dynamic>;
        return TaskModel(
          id: 'local_${payload.hashCode}',
          title: payload['title'] as String? ?? 'Untitled',
          description: payload['description'] as String?,
          priority: payload['priority'] as String? ?? 'MEDIUM',
          status: 'PENDING',
          dueDate: payload['dueDate'] != null ? DateTime.tryParse(payload['dueDate'] as String) : null,
          createdAt: DateTime.now(),
          assignments: [],
          isPersonal: true,
        );
      }).toList();
      notifyListeners();
    } catch (_) {}
  }

  /// Sync all queued personal tasks to backend when online
  Future<void> syncPersonalTasks() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final existing = prefs.getStringList(_personalTasksKey) ?? [];
      if (existing.isEmpty) return;

      final synced = <String>[];
      for (final jsonStr in existing) {
        try {
          final payload = json.decode(jsonStr) as Map<String, dynamic>;
          final response = await ApiService.client.post('/tasks', data: payload);
          if (response.data['success'] == true) {
            synced.add(jsonStr);
          }
        } catch (_) {
          // Keep unsent items in queue
          break;
        }
      }

      // Remove synced items from queue
      if (synced.isNotEmpty) {
        existing.removeWhere((item) => synced.contains(item));
        await prefs.setStringList(_personalTasksKey, existing);
        _personalTasks.removeWhere((t) => t.id.startsWith('local_'));
        await fetchMyTasks();
      }
    } catch (_) {}
  }
}

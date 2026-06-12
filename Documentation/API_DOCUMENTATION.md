# 📡 API Documentation

Complete API reference for Eazzio Payroll backend. Base URL: `https://api.eazzio.com/api/v1`

---

## 1. Authentication Endpoints (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/verify-otp` - Verify OTP for password reset
- `POST /auth/reset-password` - Reset password using OTP
- `GET /auth/me` - Get current authenticated user profile
- `PATCH /auth/profile/image` - Update user profile image

---

## 2. User Endpoints (`/users`)
- `POST /users` - Create a new user (Admin/Manager)
- `GET /users` - List all users (Admin/Manager)
- `GET /users/:id` - Get user profile (Admin/Manager)
- `PATCH /users/:id` - Update user profile (Admin/Manager)
- `DELETE /users/:id` - Delete user (Admin/Manager)
- `POST /users/:id/assign-territory` - Assign territory to user (Admin/Manager)
- `POST /users/:id/reset-password` - Force password reset for user (Admin/Manager)
- `GET /users/:id/performance` - Get user performance stats (Admin/Manager)
- `GET /users/:id/hierarchy` - Get user organization hierarchy (Admin/Manager)

---

## 3. Attendance Endpoints (`/attendance`)
- `POST /attendance/check-in` - Check-in for attendance (Field Staff)
- `POST /attendance/check-out` - Check-out from attendance (Field Staff)
- `POST /attendance/status-photo` - Upload status photo (Field Staff)
- `GET /attendance` - List attendance history
- `GET /attendance/today` - Get today's attendance (Admin/Manager)
- `GET /attendance/summary` - Get attendance summary (Admin/Manager)
- `PATCH /attendance/:id` - Manual attendance correction (Admin)

---

## 4. Location Endpoints (`/location`)
- `POST /location/batch` - Submit location updates in batch (Field Staff)
- `GET /location/live` - Get live locations of team members (Admin/Manager)
- `GET /location/:userId/history` - Get location playback history for a user (Admin/Manager)

---

## 5. Task Endpoints (`/tasks`)
- `POST /tasks` - Create a new task
- `GET /tasks` - List tasks
- `GET /tasks/my` - Get tasks assigned to current user
- `GET /tasks/:id` - Get task details
- `PATCH /tasks/:id` - Update task (Admin/Manager)
- `DELETE /tasks/:id` - Delete task (Admin)
- `POST /tasks/:id/assign` - Assign task to user (Admin/Manager)
- `PATCH /tasks/:id/assignments/:assignmentId` - Update assignment status
- `POST /tasks/:id/comments` - Add comment to task
- `GET /tasks/:id/comments` - List task comments

---

## 6. Leave Endpoints (`/leave`)
- `POST /leave/apply` - Apply for leave
- `GET /leave/my` - Get current user's leaves
- `GET /leave/balance` - Get leave balance
- `GET /leave/team` - Get team leaves (Admin/Manager)
- `GET /leave/all` - Get all leaves (Admin)
- `GET /leave/report` - Get consolidated leave report (Admin/Manager)
- `PUT /leave/:id/approve` - Approve leave (Admin/Manager)
- `PUT /leave/:id/reject` - Reject leave (Admin/Manager)
- `DELETE /leave/:id` - Cancel leave request

---

## 7. Expense Endpoints (`/expenses`)
- `POST /expenses` - Submit new expense
- `GET /expenses/my` - Get current user's expenses
- `GET /expenses/team` - Get team expenses (Admin/Manager)
- `GET /expenses/all` - Get all expenses (Admin)
- `GET /expenses/summary` - Get expense summary (Admin/Manager)
- `PUT /expenses/:id` - Update expense
- `PUT /expenses/:id/submit` - Submit expense for approval
- `PUT /expenses/:id/approve` - Approve expense (Admin/Manager)
- `PUT /expenses/:id/reject` - Reject expense (Admin/Manager)
- `DELETE /expenses/:id` - Remove expense

---

## 8. Geofence Endpoints (`/geofence`)
- `POST /geofence/ping` - GPS ping for field staff
- `GET /geofence/route/today` - Get today's route
- `GET /geofence/route/:userId` - Get user's today route (Admin/Manager)
- `POST /geofence/zones` - Create geofence zone (Admin)
- `GET /geofence/zones` - List geofence zones
- `PUT /geofence/zones/:id` - Update geofence zone (Admin)
- `DELETE /geofence/zones/:id` - Delete geofence zone (Admin)
- `POST /geofence/zones/:id/assign` - Assign geofence zone (Admin/Manager)
- `GET /geofence/alerts` - Get geofence alerts (Admin/Manager)
- `PUT /geofence/alerts/:id/resolve` - Resolve geofence alert (Admin/Manager)

---

## 9. Notification Endpoints (`/notifications`)
- `POST /notifications/send` - Send notification
- `GET /notifications/all` - Get all notifications
- `GET /notifications` - Get current user's notifications
- `GET /notifications/unread-count` - Get unread notifications count
- `PUT /notifications/read-all` - Mark all notifications as read
- `PUT /notifications/:id/read` - Mark specific notification as read
- `DELETE /notifications/:id` - Remove notification

---

## 10. Dashboard Endpoints (`/dashboard`)
- `GET /dashboard/admin` - Get Admin dashboard metrics (Admin/Manager)
- `GET /dashboard/field-staff` - Get Field Staff dashboard metrics (Field Staff)

---

## 11. Export Endpoints (`/export`)
- `GET /export/attendance` - Export attendance report (Admin/Manager)
- `GET /export/visits` - Export visits report (Admin/Manager)

---

## 12. Shift Endpoints (`/shifts`)
- `GET /shifts` - List all shifts (Admin/Manager)
- `GET /shifts/:id` - Get shift details
- `POST /shifts` - Create a new shift (Admin)
- `PATCH /shifts/:id` - Update shift (Admin)
- `DELETE /shifts/:id` - Delete shift (Admin)

---

## 13. Project Endpoints (`/projects`)
- `POST /projects` - Create a new project (Admin/Manager)
- `GET /projects` - List projects
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project (Admin/Manager)
- `DELETE /projects/:id` - Delete project (Admin)

---

## 14. Travel Endpoints (`/travel`)
- `GET /travel/my/today` - Get today's travel log (Field Staff)
- `PATCH /travel/my/today` - Upsert today's travel log (meter readings/proof)
- `GET /travel/my` - Get paginated travel history
- `GET /travel/attendance/monthly-summary` - Get monthly attendance travel summary
- `GET /travel/all` - Get travel logs summary for an employee (Admin/Manager)

---

## 15. Advance Endpoints (`/advance`)
- `POST /advance` - Request a cash advance
- `GET /advance/my` - Get my cash advances
- `GET /advance/all` - Get all advances (Admin/Manager)
- `PUT /advance/:id/approve` - Approve advance (Admin/Manager)
- `PUT /advance/:id/reject` - Reject advance (Admin/Manager)

---

## 16. Map Endpoints (`/map`)
- `GET /map/token` - Get Mappls API token
- `GET /map/search` - Search location
- `GET /map/reverse-geocode` - Reverse geocode coordinates

---

## 17. Feedback Endpoints (`/feedback`)
- `POST /feedback/submit` - Submit anonymous feedback (No Auth required)
- `GET /feedback/all` - Get all feedback list (Admin/Manager)

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

Common Error Codes:
- `VALIDATION_ERROR` (400)
- `AUTHENTICATION_REQUIRED` (401)
- `AUTHORIZATION_FAILED` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `SERVER_ERROR` (500)

---

## Authentication Headers

All authenticated endpoints require:

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

<div align="center">

**API Version:** 1.0  
**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)
</div>

# ✨ Feature Documentation

Comprehensive guide to all Eazzio Payroll features.

---

## 1. Real-Time Tracking & Monitoring

### Features

**Live GPS Tracking**
- Real-time agent location on interactive map
- Updates every 30 seconds (configurable)
- Battery level, speed, and accuracy metrics
- Location history with playback
- Multiple map layers (satellite, street, hybrid)

**Team Dashboard**
- View all team members on single map
- Filter by status (active, offline, idle)
- See agent details on hover
- Real-time updates via WebSocket
- Export location data

### Configuration

```
// Mobile app: AndroidManifest.xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

// Background service runs every 30 seconds
LocationService().startTracking(interval: 30000);
```

### Usage Example

```
Admin/Manager Dashboard:
1. Navigate to "Map" section
2. See all team members in real-time
3. Click on agent to view:
   - Current location
   - Speed & accuracy
   - Battery level
   - Last update time
4. View location history:
   - Date range picker
   - Playback animation
   - Export as KML
```

---

## 2. Geofencing & Territory Management

### Features

**Custom Geofences**
- Create polygon or circular zones
- Automatic entry/exit detection
- Real-time alerts on boundary breach
- Multiple geofence types (Office, Territory, Restricted)
- Geofence scheduling (active only during work hours)

**Alert Types**
- Entry alert: When employee enters zone
- Exit alert: When employee leaves zone
- Dwelling alert: Stationary for >30 min
- Breach alert: Unauthorized zone entry

### Creating Geofence

```
API: POST /geofence/create
{
  "name": "Delhi Office",
  "type": "POLYGON",
  "coordinates": [
    {"lat": 28.7041, "lng": 77.1025},
    {"lat": 28.7050, "lng": 77.1035},
    {"lat": 28.7045, "lng": 77.1045},
    {"lat": 28.7035, "lng": 77.1035}
  ],
  "alertOn": "BREACH",
  "alertEmail": "manager@eazzio.com"
}
```

### Mobile Experience

```
User receives:
1. Notification when entering geofence
2. Notification when exiting geofence
3. Alert if trying to leave during work hours
4. Can acknowledge alert or provide reason
```

---

## 3. Attendance & Time Management

### Check-In/Check-Out

**Features**
- One-tap check-in with GPS location
- Mandatory selfie photo (face detection)
- Offline support (syncs when online)
- Late arrival notification
- Early departure warning

**Data Captured**
- Timestamp
- GPS coordinates
- Photo (stored on Cloudinary)
- Device info (model, OS, app version)
- Network type (WiFi, 4G, etc.)

### Attendance Report

```
Shows for date range:
- Attendance status (Present/Absent/Late/Half-day)
- Check-in time & location
- Check-out time & location
- Work duration in hours
- Photos for verification

Analytics:
- Attendance rate (%)
- Late arrival trends
- Early departure patterns
- Monthly summary
```

### Admin Controls

```
Configuration available for:
- Check-in time window (e.g., 8:00-9:00 AM)
- Late threshold (e.g., 5 minutes)
- Mandatory photo verification
- Location tolerance radius
- Break hour exceptions
```

---

## 4. Task Management

### Create & Assign Tasks

**Fields**
- Title, description, priority (Low/Medium/High/Urgent)
- Assigned to specific employee
- Due date & time
- Location (with radius)
- Attachment support
- Project association
- Custom notes

**Statuses**
- PENDING: Not yet started
- IN_PROGRESS: Task started
- COMPLETED: Task finished
- CANCELLED: Task cancelled
- OVERDUE: Past due date

### Task Workflow

```
1. Manager creates task
   ↓
2. Employee receives notification
   ↓
3. Employee accepts/rejects task
   ↓
4. Task shows on employee dashboard
   ↓
5. Employee marks as completed with:
   - Completion photo
   - Notes
   - Time taken
   ↓
6. Task completion notification sent to manager
```

### Mobile Experience

```
Employee app:
- "Tasks" tab shows assigned tasks
- Can filter by status, priority, date
- Task details view with map location
- Start task → Mark as completed
- Camera for task completion photo
- Offline support
```

---

## 5. Leave Management

### Apply for Leave

**Leave Types**
- Casual Leave (default: 12 days/year)
- Sick Leave (default: 8 days/year)
- Earned Leave (default: 15 days/year)
- Unpaid Leave (unlimited with approval)
- Special Leave (marriage, bereavement, etc.)

**Application Process**

```
1. Employee opens "Leave" section
2. Selects leave type
3. Chooses start & end dates
4. Adds reason & optional attachment
5. Submits for approval
6. Manager receives notification
7. Manager approves or rejects
8. Employee notified of status
```

### Leave Balance

```
Shows:
- Total days allocated
- Days used
- Days remaining
- Pending requests
- Approved dates
- Month-wise breakdown
```

### Bulk Import

```
Admin can:
- Upload CSV with employee leave data
- Set holidays for all employees
- Configure leave policies
- View company-wide leave calendar
```

---

## 6. Expense Management

### Submit Expense

**Supported Categories**
- Travel (flights, trains, taxi)
- Meals
- Accommodation
- Client entertainment
- Office supplies
- Communication

**Required Info**
- Expense title
- Amount & currency
- Category
- Date
- Receipt photo/file
- Description
- Project (optional)

### Approval Workflow

```
1. Employee submits expense with receipt
2. System validates:
   - Amount within policy limit?
   - Category allowed?
   - Receipt legible?
3. Manager receives notification
4. Manager can:
   - Approve (full amount)
   - Partial approve (adjust amount)
   - Reject (request clarification)
5. Employee notified
6. Approved expenses added to reimbursement
7. Finance team marks as paid
```

### Expense Reports

```
Manager/Admin can view:
- Expenses by employee
- Expenses by project
- Expenses by category
- Date range analysis
- Pending reimbursements
- Approved vs rejected ratio
- Export for accounting system
```

---

## 7. Leave & Advance Requests

### Advance Salary Request

**Features**
- Request up to 50% of monthly salary
- Specify amount needed
- Provide reason
- Auto-calculation of deduction schedule

**Approval Process**

```
1. Employee requests advance
2. HR receives notification
3. HR approves/rejects
4. If approved:
   - Amount transferred
   - Deduction starts next month
   - Schedule shows on payslip
5. Employee receives confirmation
```

---

## 8. Analytics & Reporting

### Dashboard Metrics

**Overview**
- Total employees
- Active today
- Attendance rate (%)
- Tasks completed
- Pending expenses
- Active projects

**Charts**
- Attendance trend (weekly/monthly)
- Task completion rate
- Top performers
- Location heat map
- Expense distribution
- Leave distribution

### Detailed Reports

**Attendance Report**
- Date range selection
- Export to Excel
- Attendance vs policy
- Trend analysis
- Department comparison

**Task Report**
- Task completion rate
- Average task duration
- Task distribution by category
- Overdue task analysis
- Team productivity

**Expense Report**
- Expenses by category
- Reimbursement summary
- Expense per employee
- Project cost analysis
- Budget vs actual

**Team Performance**
- Individual KPIs
- Team comparison
- Departmental analysis
- Month-on-month trends
- Peer benchmarking

---

## 9. Real-Time Notifications

### Notification Types

**Task Notifications**
- Task assigned
- Task due soon (1 day before)
- Task overdue
- Task completion requested
- Task approved/rejected

**Attendance Notifications**
- Check-in reminder
- Late arrival alert
- Check-out reminder
- Missed check-in

**Leave Notifications**
- Leave request approved/rejected
- Leave balance low
- Holiday reminder

**Geofence Notifications**
- Entered/exited zone
- Boundary breach
- Unusual location activity

**Expense Notifications**
- Expense approved/rejected
- Reimbursement status
- Policy violation

### Notification Channels

- In-app notifications
- Push notifications (Android/iOS)
- Email notifications
- SMS (optional)

---

## 10. Map Features

### Live Map

**Features**
- Real-time agent positions
- Agent status indicators
- Zoom to agent
- View agent details
- Draw routes
- Measure distances

**Layers**
- Traffic
- Satellite
- Terrain
- Weather

### Playback

**Functionality**
- Select date & time range
- Play location history as animation
- Speed controls (1x, 2x, 4x)
- Pause & resume
- Jump to specific time
- Export as video

---

## 11. User Management

### Role Management

**Admin Panel**
- Create/edit/delete users
- Assign roles
- Manage permissions
- Set access restrictions
- Bulk import

**Roles**
- Admin: Full access
- Manager: Team access
- Field Staff: Personal access

### Team Hierarchy

```
Organization Structure:
CEO
├── HR Manager
├── Sales Manager
│   ├── Sales Executive 1
│   ├── Sales Executive 2
│   └── Sales Executive 3
└── Operations Manager
    ├── Field Agent 1
    └── Field Agent 2
```

---

## 12. Integration Features

### APIs Available

- REST APIs for all operations
- WebSocket for real-time updates
- Webhook support (for external integrations)
- OAuth 2.0 authentication

### Export Formats

- Excel (.xlsx)
- PDF (.pdf)
- CSV (.csv)
- JSON (.json)
- KML (for maps)

---

## 13. Settings & Configuration

### Admin Settings

**System Configuration**
- Company details
- Logo & branding
- Timezone
- Language
- Currency

**Policy Settings**
- Attendance policy
- Leave allocation
- Expense limits
- Work hours
- Holidays

**Security Settings**
- Password policy
- Session timeout
- Two-factor authentication
- IP whitelist

**Notification Settings**
- Email preferences
- SMS settings
- Notification frequency
- Alert recipients

---

<div align="center">

**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)

</div>

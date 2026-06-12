# 🗄️ Database Schema & Design

Complete PostgreSQL database structure for Eazzio Payroll.

---

## Core Tables

### User (Authentication)
```sql
CREATE TABLE "User" (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('ADMIN', 'MANAGER', 'FIELD_STAFF'),
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  avatar TEXT,
  lastLogin TIMESTAMP,
  loginAttempts INT DEFAULT 0,
  lockUntil TIMESTAMP,
  companyId UUID NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  deletedAt TIMESTAMP
);
```

### Employee (Staff Details)
```sql
CREATE TABLE "Employee" (
  id UUID PRIMARY KEY,
  userId UUID UNIQUE NOT NULL REFERENCES "User",
  companyId UUID NOT NULL,
  employeeCode VARCHAR(50) UNIQUE,
  department VARCHAR(100),
  designation VARCHAR(100),
  managerId UUID REFERENCES "Employee",
  joinDate DATE,
  endDate DATE,
  salary DECIMAL(12, 2),
  bankAccount VARCHAR(20),
  bankName VARCHAR(100),
  panNumber VARCHAR(10),
  phone VARCHAR(20),
  address TEXT,
  emergencyContact VARCHAR(100),
  emergencyPhone VARCHAR(20),
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

### Attendance
```sql
CREATE TABLE "Attendance" (
  id UUID PRIMARY KEY,
  employeeId UUID NOT NULL REFERENCES "Employee",
  date DATE NOT NULL,
  checkInTime TIMESTAMP,
  checkOutTime TIMESTAMP,
  checkInLocation JSONB,
  checkOutLocation JSONB,
  checkInPhoto TEXT,
  checkOutPhoto TEXT,
  workDuration INT, -- minutes
  status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY', 'LEAVE'),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(employeeId, date)
);

-- Indexes
CREATE INDEX idx_attendance_employee_date ON "Attendance"(employeeId, date);
CREATE INDEX idx_attendance_date_range ON "Attendance"(date);
```

### Location (GPS Tracking)
```sql
CREATE TABLE "Location" (
  id UUID PRIMARY KEY,
  employeeId UUID NOT NULL REFERENCES "Employee",
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy INT,
  speed INT,
  battery INT,
  address TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  geohash VARCHAR(12),
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_employee_timestamp (employeeId, timestamp),
  INDEX idx_geohash (geohash),
  INDEX idx_timestamp (timestamp DESC)
);
```

### Task
```sql
CREATE TABLE "Task" (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  projectId UUID NOT NULL REFERENCES "Project",
  assignedTo UUID NOT NULL REFERENCES "Employee",
  assignedBy UUID NOT NULL REFERENCES "User",
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'),
  dueDate TIMESTAMP,
  location JSONB,
  attachment TEXT,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  completedAt TIMESTAMP,
  INDEX idx_assigned_to (assignedTo),
  INDEX idx_status (status),
  INDEX idx_due_date (dueDate)
);
```

### Leave
```sql
CREATE TABLE "Leave" (
  id UUID PRIMARY KEY,
  employeeId UUID NOT NULL REFERENCES "Employee",
  leaveType ENUM('SICK', 'CASUAL', 'EARNED', 'UNPAID', 'OTHER'),
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  days INT GENERATED ALWAYS AS (endDate - startDate + 1) STORED,
  reason TEXT,
  attachment TEXT,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  approvedBy UUID REFERENCES "User",
  rejectionReason TEXT,
  appliedAt TIMESTAMP DEFAULT NOW(),
  approvedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_employee_dates (employeeId, startDate, endDate)
);
```

### Expense
```sql
CREATE TABLE "Expense" (
  id UUID PRIMARY KEY,
  employeeId UUID NOT NULL REFERENCES "Employee",
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  date DATE NOT NULL,
  description TEXT,
  receipt TEXT,
  projectId UUID REFERENCES "Project",
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID') DEFAULT 'PENDING',
  approvedBy UUID REFERENCES "User",
  approvedAt TIMESTAMP,
  rejectionReason TEXT,
  submittedAt TIMESTAMP DEFAULT NOW(),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_employee_status (employeeId, status),
  INDEX idx_date (date)
);
```

### Geofence
```sql
CREATE TABLE "Geofence" (
  id UUID PRIMARY KEY,
  companyId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL, -- Array of {lat, lng}
  radius INT, -- meters
  type ENUM('POLYGON', 'CIRCLE', 'RECTANGLE'),
  alertOn ENUM('ENTRY', 'EXIT', 'BREACH', 'BOTH') DEFAULT 'BREACH',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_company_active (companyId, isActive)
);
```

### Notification
```sql
CREATE TABLE "Notification" (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES "User",
  type ENUM('TASK', 'ATTENDANCE', 'LEAVE', 'GEOFENCE', 'EXPENSE', 'SYSTEM'),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_read (userId, read),
  INDEX idx_created_at (createdAt DESC)
);
```

### AuditLog (Compliance)
```sql
CREATE TABLE "AuditLog" (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES "User",
  action VARCHAR(100) NOT NULL,
  resourceType VARCHAR(50),
  resourceId UUID,
  changes JSONB,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_action (userId, action),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_resource (resourceType, resourceId)
);
```

---

## Key Relationships

```
User (1) ──────── (1) Employee
User (1) ──────── (n) AuditLog
User (1) ──────── (n) Notification
User (1) ──────── (n) Task (assignedBy)

Employee (1) ──────── (n) Attendance
Employee (1) ──────── (n) Location
Employee (1) ──────── (n) Task (assignedTo)
Employee (1) ──────── (n) Leave
Employee (1) ──────── (n) Expense
Employee (n) ──────── (1) Employee (manager)

Task (n) ──────---- (1) Project
Task (1) ──────---- (n) TaskUpdate

Expense (n) ──────---- (1) Project

Leave (1) ──────---- (1) LeaveType
```

---

## Indexes Strategy

**High-Priority Indexes:**
- `Location(employeeId, timestamp)` - Live tracking queries
- `Attendance(employeeId, date)` - Daily attendance checks
- `Task(assignedTo, status)` - Personal task queries
- `User(email)` - Authentication
- `AuditLog(timestamp)` - Compliance queries

**Medium-Priority Indexes:**
- `Expense(employeeId, status)` - Expense management
- `Leave(employeeId, dates)` - Leave balance queries
- `Notification(userId, read)` - Notification feed

---

## Data Retention Policy

| Table | Retention | Archive |
|-------|-----------|---------|
| Location | 6 months | Yes |
| Attendance | 7 years | Yes |
| AuditLog | 7 years | Yes |
| Task | Permanent | N/A |
| Leave | Permanent | N/A |
| Expense | 7 years | Yes |
| Notification | 90 days | No |

---

## Constraints & Validations

```sql
-- Prevent future-dated check-in
ALTER TABLE "Attendance" ADD CONSTRAINT check_checkin_date 
  CHECK (checkInTime <= NOW());

-- Ensure positive work duration
ALTER TABLE "Attendance" ADD CONSTRAINT check_work_duration 
  CHECK (workDuration >= 0);

-- Ensure end date >= start date
ALTER TABLE "Leave" ADD CONSTRAINT check_leave_dates 
  CHECK (endDate >= startDate);

-- Prevent negative expenses
ALTER TABLE "Expense" ADD CONSTRAINT check_expense_amount 
  CHECK (amount > 0);

-- Location coordinates validation
ALTER TABLE "Location" ADD CONSTRAINT check_lat_range 
  CHECK (latitude >= -90 AND latitude <= 90);
ALTER TABLE "Location" ADD CONSTRAINT check_lng_range 
  CHECK (longitude >= -180 AND longitude <= 180);
```

---

<div align="center">

**Schema Version:** 2.0  
**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)

</div>

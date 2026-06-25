const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const locationRoutes = require('./location.routes');
const attendanceRoutes = require('./attendance.routes');
const taskRoutes = require('./task.routes');
const dashboardRoutes = require('./dashboard.routes');
const exportRoutes = require('./export.routes');
const leaveRoutes = require('./leave.routes');
const geofenceRoutes = require('./geofence.routes');
const expenseRoutes = require('./expense.routes');
const notificationRoutes = require('./notification.routes');
const mapRoutes = require('./map.routes');
const feedbackRoutes = require('./feedback.routes');
const projectRoutes = require('./project.routes');
const travelRoutes = require('./travel.routes');
const advanceRoutes = require('./advance.routes');
const shiftRoutes = require('./shift.routes');
const visitRoutes = require('./visit.routes');
const salaryRoutes = require('./salary.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/shifts', shiftRoutes);

router.use('/users', userRoutes);
router.use('/visits', visitRoutes);
router.use('/location', locationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/export', exportRoutes);
router.use('/leave', leaveRoutes);
router.use('/geofence', geofenceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/notifications', notificationRoutes);
router.use('/map', mapRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/projects', projectRoutes);
router.use('/travel', travelRoutes);
router.use('/advance', advanceRoutes);
router.use('/salary', salaryRoutes);

module.exports = router;

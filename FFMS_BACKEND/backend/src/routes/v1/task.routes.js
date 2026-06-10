const express = require('express');
const taskController = require('../../controllers/task.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all task routes
router.use(authenticate);
router.use(checkOrgAccess);

router.post('/',                    authorize('ADMIN', 'MANAGER', 'FIELD_STAFF'), taskController.createTask)
router.get('/',                     taskController.listTasks)
router.get('/my',                   taskController.getMyTasks)          
router.get('/:id',                  taskController.getTaskById)
router.patch('/:id',                authorize('ADMIN', 'MANAGER'), taskController.updateTask)
router.delete('/:id',               authorize('ADMIN'), taskController.deleteTask)
router.post('/:id/assign',          authorize('ADMIN', 'MANAGER'), taskController.assignTask)  
router.patch('/:id/assignments/:assignmentId', taskController.updateAssignmentStatus)
router.post('/:id/comments',        taskController.addComment)
router.get('/:id/comments',         taskController.listComments)

module.exports = router;

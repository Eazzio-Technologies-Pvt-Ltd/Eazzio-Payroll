const express = require('express');
const userController = require('../../controllers/user.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all user endpoints
router.use(authenticate);
router.use(checkOrgAccess);

// Routes
router.post('/', authorize('ADMIN','MANAGER'), userController.createUser);
router.get('/', authorize('ADMIN', 'MANAGER'), userController.listUsers);
router.get('/:id', authorize('ADMIN', 'MANAGER'), userController.getUserById);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), userController.updateUser);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), userController.deleteUser);

// Territory and Password Operations
router.post('/:id/assign-territory', authorize('ADMIN', 'MANAGER'), userController.assignTerritory);
router.post('/:id/reset-password', authorize('ADMIN', 'MANAGER'), userController.forceResetPassword);

// Performance stats
router.get('/:id/performance', authorize('ADMIN', 'MANAGER'), userController.getUserPerformance);

// Organization Hierarchy
router.get('/:id/hierarchy', authorize('ADMIN', 'MANAGER'), userController.getHierarchy);


module.exports = router;

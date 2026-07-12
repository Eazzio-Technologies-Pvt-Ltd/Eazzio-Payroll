const express = require('express');
const projectController = require('../../controllers/project.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all project routes
router.use(authenticate);
router.use(checkOrgAccess);

router.post('/',             authorize('ADMIN', 'MANAGER'), projectController.createProject);
router.get('/',              projectController.listProjects);
router.get('/:id',           projectController.getProjectById);
router.patch('/:id',         authorize('ADMIN', 'MANAGER'), projectController.updateProject);
router.delete('/:id',        authorize('ADMIN'), projectController.deleteProject);

module.exports = router;

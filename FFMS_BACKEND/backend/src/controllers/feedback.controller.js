const feedbackService = require('../services/feedback.service');
const { successResponse } = require('../utils/response');

// Unauthenticated public submission (no req.user available here)
const submit = async (req, res, next) => {
  try {
    // For true anonymity, we don't even log IP if we can avoid it.
    // We just take the orgId and payload.
    const { organizationId, category, content, rating } = req.body;
    
    if (!organizationId) {
      const err = new Error('Organization ID is required');
      err.statusCode = 400;
      throw err;
    }

    const feedback = await feedbackService.submitFeedback({
      organizationId,
      category,
      content,
      rating
    });
    
    return successResponse(res, feedback, 201);
  } catch (err) {
    next(err);
  }
};

// Authenticated fetching for admin/manager
const getList = async (req, res, next) => {
  try {
    const { page, limit, category } = req.query;
    const data = await feedbackService.getFeedbackList(req.user.organizationId, {
      page: +page || 1,
      limit: +limit || 20,
      category
    });
    
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submit,
  getList
};

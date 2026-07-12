const visitService = require('../services/visit.service');
const { createVisitReportSchema } = require('../validations/visit.validation');
const { successResponse } = require('../utils/response');
const { BadRequestError } = require('../utils/errors');

/**
 * Submit a visit report
 */
const createVisit = async (req, res, next) => {
  try {
    const parseResult = createVisitReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const result = await visitService.createVisitReport(req.user.id, parseResult.data);

    // Audit logging
    await req.logAudit({
      action: 'CREATE_VISIT_REPORT',
      resource: 'VisitReport',
      resourceId: result.id,
      newValues: result
    });

    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createVisit
};

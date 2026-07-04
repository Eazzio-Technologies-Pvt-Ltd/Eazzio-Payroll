const salaryService = require('../services/salary.service');

exports.getSalaryList = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { month } = req.query; // format: "YYYY-MM"

    const result = await salaryService.getSalaryList(organizationId, month);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[salary.controller] getSalaryList Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch salary data' } });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { baseSalary, bonus } = req.body;

    const updatedUser = await salaryService.updateSalaryStructure(userId, organizationId, { baseSalary, bonus });

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('[salary.controller] updateSalaryStructure Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update salary structure' } });
  }
};

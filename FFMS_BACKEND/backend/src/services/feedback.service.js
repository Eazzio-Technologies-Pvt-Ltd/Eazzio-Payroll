const prisma = require('../config/prisma');

const submitFeedback = async ({ organizationId, category, content, rating }) => {
  return prisma.employeeFeedback.create({
    data: {
      organizationId,
      category: category || 'OTHER',
      content,
      rating: rating ? parseInt(rating, 10) : null
    }
  });
};

const getFeedbackList = async (organizationId, { page = 1, limit = 20, category }) => {
  const where = { organizationId };
  if (category) where.category = category;

  const [feedbacks, total] = await Promise.all([
    prisma.employeeFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employeeFeedback.count({ where })
  ]);

  return { feedbacks, total, page, limit };
};

module.exports = {
  submitFeedback,
  getFeedbackList
};

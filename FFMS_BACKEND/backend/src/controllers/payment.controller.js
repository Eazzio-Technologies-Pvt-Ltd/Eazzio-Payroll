const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { BadRequestError } = require('../utils/errors');


const createOrder = async (req, res, next) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are not configured in environment variables.');
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const { plan } = req.body;
    const userId = req.user.id;

    if (!['FREE', 'BASIC', 'PRO'].includes(plan)) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startsAt.getDate() + 30);

    if (plan === 'FREE') {
      await prisma.subscription.create({
        data: {
          userId,
          plan,
          status: 'ACTIVE',
          startsAt,
          expiresAt
        }
      });
      return res.json({ success: true });
    }

    // Amount in paise
    const amount = plan === 'BASIC' ? 49900 : 99900;
    
    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_sub_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    await prisma.subscription.create({
      data: {
        userId,
        plan,
        status: 'PENDING',
        razorpayOrderId: order.id,
        startsAt,
        expiresAt
      }
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err) {
    console.error("Razorpay Create Order Error:", err);
    next(err);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay key secret is not configured in environment variables.');
    }

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = shasum.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Signature verification failed' });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        razorpayPaymentId: razorpay_payment_id
      }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Razorpay Verify Payment Error:", err);
    next(err);
  }
};

const getSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!subscription || new Date(subscription.expiresAt) < new Date()) {
      return res.json({ active: false });
    }

    return res.json({
      active: true,
      plan: subscription.plan,
      expiresAt: subscription.expiresAt
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getSubscription
};

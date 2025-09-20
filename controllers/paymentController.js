const Payment = require('../models/Payment');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const payfast = require('../config/payfast');
const { distributeFunds } = require('../utils/paymentHelpers');
const { sendEmail } = require('../utils/emailService');

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { businessId, amount, paymentType, plan } = req.body;
    
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership
    if (business.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process payment for this business'
      });
    }

    // Create payment data for PayFast
    const paymentData = {
      merchant_id: payfast.merchantId,
      merchant_key: payfast.merchantKey,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      notify_url: `${process.env.BACKEND_URL}/api/payments/notify`,
      amount: amount.toFixed(2),
      item_name: `West Coast Digital - ${plan}`,
      item_description: `Payment for ${paymentType}`,
      name_first: req.user.firstName,
      name_last: req.user.lastName,
      email_address: req.user.email,
      custom_int1: business

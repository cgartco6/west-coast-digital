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
      custom_int1: businessId,
      custom_str1: paymentType,
      custom_str2: plan
    };

    // Generate signature
    const signature = payfast.generateSignature(paymentData);
    paymentData.signature = signature;

    // Save payment record as pending
    const payment = new Payment({
      business: businessId,
      user: req.user.id,
      amount,
      paymentType,
      plan,
      status: 'pending',
      paymentMethod: 'payfast',
      payfastData: paymentData
    });

    await payment.save();

    res.json({
      success: true,
      paymentUrl: `${payfast.paymentUrl}?${new URLSearchParams(paymentData).toString()}`,
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing failed'
    });
  }
};

// Handle PayFast ITN (Instant Transaction Notification)
exports.handleITN = async (req, res) => {
  try {
    const data = req.body;
    
    // Verify the signature
    const signature = data.signature;
    delete data.signature;
    
    const calculatedSignature = payfast.generateSignature(data);
    if (signature !== calculatedSignature) {
      return res.status(400).send('Invalid signature');
    }
    
    // Verify the payment data with PayFast
    const isValid = await payfast.validatePayment({ ...data, signature });
    
    if (isValid && data.payment_status === 'COMPLETE') {
      // Payment is valid and complete
      const payment = await Payment.findOne({ 
        payfastPaymentId: data.pf_payment_id 
      });

      if (payment && payment.status === 'pending') {
        payment.status = 'completed';
        payment.paymentDate = new Date();
        payment.merchantPaymentId = data.m_payment_id;
        payment.payfastPaymentId = data.pf_payment_id;
        
        await payment.save();

        // Update business based on payment type
        if (payment.paymentType === 'subscription') {
          await Business.findByIdAndUpdate(payment.business, {
            subscriptionTier: payment.plan,
            subscriptionStatus: 'active',
            subscriptionStart: new Date(),
            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          });

          // Update or create subscription
          await Subscription.findOneAndUpdate(
            { business: payment.business },
            {
              business: payment.business,
              user: payment.user,
              plan: payment.plan,
              amount: payment.amount,
              status: 'active',
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            { upsert: true, new: true }
          );

        } else if (payment.paymentType === 'boost') {
          await Business.findByIdAndUpdate(payment.business, {
            isBoosted: true,
            boostExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          });
        }

        // Distribute funds
        await distributeFunds(payment);

        // Send confirmation email
        const business = await Business.findById(payment.business);
        await sendEmail({
          to: req.user.email,
          subject: 'Payment Confirmation - West Coast Digital',
          html: `
            <h2>Payment Successful!</h2>
            <p>Thank you for your payment of R${payment.amount} for ${payment.plan}.</p>
            <p>Business: ${business.businessName}</p>
            <p>Payment Type: ${payment.paymentType}</p>
            <p>Transaction ID: ${payment.payfastPaymentId}</p>
            <p>If you have any questions, please contact our support team.</p>
          `
        });
      }
      
      res.status(200).send('Payment processed successfully');
    } else {
      // Payment failed or invalid
      const payment = await Payment.findOne({ 
        payfastPaymentId: data.pf_payment_id 
      });

      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }

      res.status(400).send('Invalid payment');
    }
  } catch (error) {
    console.error('ITN handling error:', error);
    res.status(500).send('ITN processing failed');
  }
};

// Get payment history for user
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ user: req.user.id })
      .populate('business', 'businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payment history'
    });
  }
};

// Get payment by ID
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('business', 'businessName')
      .populate('user', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check ownership
    if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payment'
    });
  }
};

// Refund payment (admin only)
exports.refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    // Update payment status
    payment.status = 'refunded';
    await payment.save();

    // Reverse business changes based on payment type
    if (payment.paymentType === 'subscription') {
      await Business.findByIdAndUpdate(payment.business, {
        subscriptionTier: 'Free',
        subscriptionStatus: 'cancelled'
      });

      await Subscription.findOneAndUpdate(
        { business: payment.business },
        { status: 'cancelled' }
      );

    } else if (payment.paymentType === 'boost') {
      await Business.findByIdAndUpdate(payment.business, {
        isBoosted: false,
        boostExpiry: null
      });
    }

    res.json({
      success: true,
      message: 'Payment refunded successfully'
    });

  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing refund'
    });
  }
};

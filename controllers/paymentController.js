const Payment = require('../models/Payment');
const Business = require('../models/Business');
const payfast = require('../config/payfast');

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { businessId, amount, paymentType, plan } = req.body;
    
    // Create payment data for PayFast
    const paymentData = {
      merchant_id: payfast.merchantId,
      merchant_key: payfast.merchantKey,
      return_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      notify_url: `${process.env.BACKEND_URL}/api/payments/notify`,
      amount: amount,
      item_name: `West Coast Digital - ${plan} Plan`,
      item_description: `Payment for ${paymentType}`,
      custom_int1: businessId,
      custom_str1: paymentType
    };

    // Generate signature
    const signature = payfast.generateSignature(paymentData);
    paymentData.signature = signature;

    // Save payment record as pending
    const payment = new Payment({
      business: businessId,
      amount,
      paymentType,
      plan,
      status: 'pending',
      payfastData: paymentData
    });

    await payment.save();

    // Redirect to PayFast
    res.json({
      success: true,
      paymentUrl: `${payfast.paymentUrl}?${new URLSearchParams(paymentData).toString()}`
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, message: 'Payment processing failed' });
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
    const verifyData = { ...data, signature: signature };
    const isValid = await payfast.validatePayment(verifyData);
    
    if (isValid) {
      // Payment is valid, update our records
      const payment = await Payment.findOne({ payfastPaymentId: data.pf_payment_id });
      
      if (payment) {
        payment.status = 'completed';
        payment.paymentDate = new Date();
        await payment.save();
        
        // Update business based on payment type
        if (payment.paymentType === 'subscription') {
          await Business.findByIdAndUpdate(payment.business, {
            subscriptionTier: payment.plan,
            isActive: true
          });
        } else if (payment.paymentType === 'boost') {
          await Business.findByIdAndUpdate(payment.business, {
            isBoosted: true,
            boostExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          });
        }
        
        // Distribute funds (70% to owner, 30% to reserve)
        const ownerAmount = payment.amount * 0.7;
        const reserveAmount = payment.amount * 0.3;
        
        // Here you would implement the actual bank transfers
        // This would typically be done through your bank's API
        
        console.log(`Payment of R${payment.amount} processed successfully.`);
        console.log(`Owner amount: R${ownerAmount}, Reserve amount: R${reserveAmount}`);
      }
      
      res.status(200).send('Payment processed successfully');
    } else {
      res.status(400).send('Invalid payment');
    }
  } catch (error) {
    console.error('ITN handling error:', error);
    res.status(500).send('ITN processing failed');
  }
};

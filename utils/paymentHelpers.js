const Payment = require('../models/Payment');
const { sendEmail } = require('./emailService');

// Distribute funds according to the 70/30 split
exports.distributeFunds = async (payment) => {
  try {
    // Calculate distribution (70% to owner, 30% to reserve)
    const ownerAmount = payment.amount * 0.7;
    const reserveAmount = payment.amount * 0.6; // 30% to reserve, but 10% is for tax
    
    // Update payment with distribution details
    payment.distribution = {
      ownerAmount: parseFloat(ownerAmount.toFixed(2)),
      reserveAmount: parseFloat(reserveAmount.toFixed(2)),
      ownerAccount: process.env.FNB_OWNER_ACCOUNT,
      reserveAccount: process.env.FNB_RESERVE_ACCOUNT,
      transferred: false,
      transferDate: null
    };
    
    // Calculate tax (15% of owner's share)
    payment.taxInformation = {
      taxable: true,
      taxAmount: parseFloat((ownerAmount * 0.15).toFixed(2)),
      taxRate: 0.15
    };
    
    await payment.save();
    
    // In a real implementation, you would initiate bank transfers here
    // For now, we'll simulate the transfer process
    
    console.log(`Funds distributed for payment ${payment._id}:`);
    console.log(`- Owner (70%): R${ownerAmount.toFixed(2)}`);
    console.log(`- Reserve (30%): R${reserveAmount.toFixed(2)}`);
    console.log(`- Tax (15% of owner's share): R${payment.taxInformation.taxAmount}`);
    
    // Simulate bank transfer (in real implementation, use bank API)
    await simulateBankTransfer(payment);
    
    return true;
    
  } catch (error) {
    console.error('Fund distribution error:', error);
    return false;
  }
};

// Simulate bank transfer (replace with actual bank API integration)
const simulateBankTransfer = async (payment) => {
  try {
    // Simulate transfer delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update payment status
    payment.distribution.transferred = true;
    payment.distribution.transferDate = new Date();
    await payment.save();
    
    console.log(`Bank transfers completed for payment ${payment._id}`);
    
    // Send notification email
    await sendDistributionEmail(payment);
    
    return true;
    
  } catch (error) {
    console.error('Bank transfer simulation error:', error);
    return false;
  }
};

// Send distribution notification email
const sendDistributionEmail = async (payment) => {
  try {
    const subject = 'Funds Distributed - Payment Processed';
    const html = `
      <h2>Funds Distributed Successfully</h2>
      <p>Payment ID: ${payment._id}</p>
      <p>Amount: R${payment.amount.toFixed(2)}</p>
      <p>Distribution:</p>
      <ul>
        <li>Owner Account (${payment.distribution.ownerAccount}): R${payment.distribution.ownerAmount.toFixed(2)}</li>
        <li>Reserve Account (${payment.distribution.reserveAccount}): R${payment.distribution.reserveAmount.toFixed(2)}</li>
        <li>Tax Amount: R${payment.taxInformation.taxAmount.toFixed(2)}</li>
      </ul>
      <p>Transfer Date: ${payment.distribution.transferDate.toLocaleDateString()}</p>
    `;
    
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject,
      html
    });
    
  } catch (error) {
    console.error('Distribution email error:', error);
  }
};

// Calculate monthly revenue reports
exports.calculateRevenueReport = async (startDate, endDate) => {
  try {
    const report = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            paymentType: '$paymentType',
            plan: '$plan'
          },
          totalAmount: { $sum: '$amount' },
          transactionCount: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Calculate totals
    const totals = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          totalOwnerDistribution: { $sum: '$distribution.ownerAmount' },
          totalReserveDistribution: { $sum: '$distribution.reserveAmount' },
          totalTax: { $sum: '$taxInformation.taxAmount' }
        }
      }
    ]);
    
    return {
      report,
      totals: totals[0] || {},
      dateRange: { startDate, endDate }
    };
    
  } catch (error) {
    console.error('Revenue report calculation error:', error);
    throw error;
  }
};

// Check for pending distributions and process them
exports.processPendingDistributions = async () => {
  try {
    const pendingPayments = await Payment.find({
      status: 'completed',
      'distribution.transferred': false,
      'distribution.transferDate': { $exists: false }
    });
    
    console.log(`Found ${pendingPayments.length} pending distributions`);
    
    for (const payment of pendingPayments) {
      try {
        await this.distributeFunds(payment);
        console.log(`Processed distribution for payment ${payment._id}`);
      } catch (error) {
        console.error(`Error processing distribution for payment ${payment._id}:`, error);
      }
    }
    
    return {
      processed: pendingPayments.length,
      success: true
    };
    
  } catch (error) {
    console.error('Pending distributions processing error:', error);
    return {
      processed: 0,
      success: false,
      error: error.message
    };
  }
};

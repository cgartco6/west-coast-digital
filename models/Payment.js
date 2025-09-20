const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ZAR'
  },
  paymentType: {
    type: String,
    enum: ['subscription', 'boost', 'feature'],
    required: true
  },
  plan: {
    type: String,
    enum: ['Free', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Platinum Pro', 'Boost'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['payfast', 'bank_transfer', 'card'],
    default: 'payfast'
  },
  payfastPaymentId: String,
  merchantPaymentId: String,
  paymentDate: Date,
  processedDate: Date,
  distribution: {
    ownerAmount: Number,
    reserveAmount: Number,
    ownerAccount: {
      type: String,
      default: process.env.FNB_OWNER_ACCOUNT
    },
    reserveAccount: {
      type: String,
      default: process.env.FNB_RESERVE_ACCOUNT
    },
    transferred: {
      type: Boolean,
      default: false
    },
    transferDate: Date
  },
  taxInformation: {
    taxable: {
      type: Boolean,
      default: true
    },
    taxAmount: Number,
    taxRate: {
      type: Number,
      default: 0.15
    }
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ business: 1, paymentDate: -1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ payfastPaymentId: 1 });

// Virtual for net amount after tax
paymentSchema.virtual('netAmount').get(function() {
  if (this.taxInformation.taxable && this.taxInformation.taxAmount) {
    return this.amount - this.taxInformation.taxAmount;
  }
  return this.amount;
});

// Pre-save middleware to calculate distribution
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') && this.amount > 0) {
    this.distribution.ownerAmount = this.amount * 0.7;
    this.distribution.reserveAmount = this.amount * 0.3;
    
    // Calculate tax if applicable
    if (this.taxInformation.taxable) {
      this.taxInformation.taxAmount = this.amount * this.taxInformation.taxRate;
    }
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);

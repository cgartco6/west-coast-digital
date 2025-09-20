const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
  plan: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Platinum Pro'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'cancelled', 'expired'],
    default: 'active'
  },
  amount: {
    type: Number,
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  nextBillingDate: Date,
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['payfast', 'bank_transfer', 'card'],
    default: 'payfast'
  },
  features: {
    maxImages: Number,
    maxVideos: Number,
    socialMediaPosts: Number,
    aiContentGeneration: Boolean,
    premiumSupport: Boolean,
    analyticsAccess: Boolean,
    customDomain: Boolean,
    seoOptimization: Boolean
  },
  history: [{
    action: String,
    description: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  cancellation: {
    requested: Date,
    reason: String,
    effectiveDate: Date
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ business: 1 });
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return null;
  const now = new Date();
  const diffTime = this.endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to set end date
subscriptionSchema.pre('save', function(next) {
  if (this.isNew && this.startDate && !this.endDate) {
    const endDate = new Date(this.startDate);
    if (this.billingCycle === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    this.endDate = endDate;
    this.nextBillingDate = endDate;
  }
  next();
});

module.exports = mongoose.model('Subscription', subscriptionSchema);

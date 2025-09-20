const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    required: true,
    enum: [
      'Retail', 'Hospitality', 'Services', 'Professional', 
      'Manufacturing', 'Healthcare', 'Construction', 
      'Transport', 'Education', 'Entertainment', 'Other'
    ]
  },
  town: {
    type: String,
    required: true,
    enum: [
      'Saldanha', 'Vredenburg', 'Langebaan', 'St Helena Bay', 
      'Hopefield', 'Darling', 'Moorreesburg', 'Malmesbury', 
      'Riebeek West', 'Riebeek Kasteel', 'Yzerfontein', 
      'Piketberg', 'Porterville', 'Aurora', 'Redelinghuys',
      'Elands Bay', 'Dwarskersbos', 'Laaiplek', 'Velddrif', 
      'Cape Town', 'Tableview', 'Other'
    ]
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      maxlength: 100
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  subscriptionTier: {
    type: String,
    enum: ['Free', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Platinum Pro'],
    default: 'Free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'cancelled'],
    default: 'active'
  },
  subscriptionStart: Date,
  subscriptionEnd: Date,
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostExpiry: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  features: {
    hasWebsite: Boolean,
    hasOnlineBooking: Boolean,
    hasEcommerce: Boolean,
    hasDelivery: Boolean,
    acceptsCreditCards: Boolean
  },
  businessHours: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    open: String,
    close: String,
    closed: {
      type: Boolean,
      default: false
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  aiGeneratedContent: {
    socialMedia: Map,
    lastGenerated: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
businessSchema.index({ town: 1, industry: 1 });
businessSchema.index({ subscriptionTier: -1 });
businessSchema.index({ isBoosted: -1, boostExpiry: -1 });
businessSchema.index({ location: '2dsphere' });
businessSchema.index({ businessName: 'text', description: 'text' });

// Virtual for boost status
businessSchema.virtual('isCurrentlyBoosted').get(function() {
  return this.isBoosted && (!this.boostExpiry || this.boostExpiry > new Date());
});

// Update timestamp before saving
businessSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Business', businessSchema);

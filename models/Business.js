const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true,
    enum: ['Retail', 'Hospitality', 'Services', 'Professional', 'Manufacturing', 'Healthcare', 'Other']
  },
  town: {
    type: String,
    required: true,
    enum: ['Saldanha', 'Vredenburg', 'Langebaan', 'St Helena Bay', 'Hopefield', 
           'Darling', 'Moorreesburg', 'Malmesbury', 'Riebeek West', 'Riebeek Kasteel',
           'Yzerfontein', 'Piketberg', 'Porterville', 'Aurora', 'Redelinghuys',
           'Elands Bay', 'Dwarskersbos', 'Laaiplek', 'Velddrif', 'Cape Town', 'Tableview', 'Other']
  },
  address: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  website: {
    type: String
  },
  images: [{
    url: String,
    caption: String
  }],
  subscriptionTier: {
    type: String,
    enum: ['Free', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Platinum Pro'],
    default: 'Free'
  },
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostExpiry: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
businessSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
businessSchema.index({ town: 1, industry: 1, subscriptionTier: -1 });
businessSchema.index({ isBoosted: -1, boostExpiry: -1 });

module.exports = mongoose.model('Business', businessSchema);

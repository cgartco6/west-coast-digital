const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const { automateSocialMedia } = require('../utils/aiHelpers');

// Get all businesses with filtering and pagination
exports.getBusinesses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      town,
      industry,
      tier,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (town && town !== 'All Towns') filter.town = town;
    if (industry && industry !== 'All Industries') filter.industry = industry;
    if (tier && tier !== 'All Tiers') filter.subscriptionTier = tier;

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const businesses = await Business.find(filter)
      .populate('owner', 'firstName lastName email phone')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count for pagination
    const total = await Business.countDocuments(filter);

    res.json({
      success: true,
      businesses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching businesses'
    });
  }
};

// Get single business by ID
exports.getBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('owner', 'firstName lastName email phone');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Increment view count
    business.views += 1;
    await business.save();

    res.json({
      success: true,
      business
    });

  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching business'
    });
  }
};

// Create new business listing
exports.createBusiness = async (req, res) => {
  try {
    const businessData = {
      ...req.body,
      owner: req.user.id
    };

    const business = new Business(businessData);
    await business.save();

    // If it's a paid plan, create subscription
    if (business.subscriptionTier !== 'Free') {
      const subscription = new Subscription({
        business: business._id,
        user: req.user.id,
        plan: business.subscriptionTier,
        amount: getPlanPrice(business.subscriptionTier),
        status: 'pending'
      });
      await subscription.save();
    }

    // Populate owner info
    await business.populate('owner', 'firstName lastName email phone');

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      business
    });

  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating business'
    });
  }
};

// Update business listing
exports.updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

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
        message: 'Not authorized to update this business'
      });
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('owner', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Business updated successfully',
      business: updatedBusiness
    });

  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating business'
    });
  }
};

// Delete business listing
exports.deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

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
        message: 'Not authorized to delete this business'
      });
    }

    await Business.findByIdAndDelete(req.params.id);

    // Also delete associated subscription
    await Subscription.findOneAndDelete({ business: req.params.id });

    res.json({
      success: true,
      message: 'Business deleted successfully'
    });

  } catch (error) {
    console.error('Delete business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting business'
    });
  }
};

// Get user's businesses
exports.getUserBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ owner: req.user.id })
      .populate('owner', 'firstName lastName email phone');

    res.json({
      success: true,
      businesses
    });

  } catch (error) {
    console.error('Get user businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user businesses'
    });
  }
};

// Generate AI content for business
exports.generateAIContent = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

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
        message: 'Not authorized to generate content for this business'
      });
    }

    // Generate AI content
    const content = await automateSocialMedia(business);

    // Save generated content
    business.aiGeneratedContent = {
      socialMedia: content,
      lastGenerated: new Date()
    };
    await business.save();

    res.json({
      success: true,
      message: 'AI content generated successfully',
      content
    });

  } catch (error) {
    console.error('Generate AI content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating AI content'
    });
  }
};

// Record business click
exports.recordClick = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    business.clicks += 1;
    await business.save();

    res.json({
      success: true,
      message: 'Click recorded successfully'
    });

  } catch (error) {
    console.error('Record click error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording click'
    });
  }
};

// Helper function to get plan price
function getPlanPrice(plan) {
  const prices = {
    'Bronze': 199,
    'Silver': 499,
    'Gold': 999,
    'Platinum': 1999,
    'Platinum Pro': 3999
  };
  return prices[plan] || 0;
}

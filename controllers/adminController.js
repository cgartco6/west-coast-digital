const User = require('../models/User');
const Business = require('../models/Business');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      totalPayments,
      activeSubscriptions,
      recentPayments,
      popularTowns
    ] = await Promise.all([
      User.countDocuments(),
      Business.countDocuments(),
      Payment.countDocuments({ status: 'completed' }),
      Subscription.countDocuments({ status: 'active' }),
      Payment.find({ status: 'completed' })
        .populate('business', 'businessName')
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10),
      Business.aggregate([
        { $group: { _id: '$town', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Calculate revenue
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Monthly revenue data
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBusinesses,
        totalPayments,
        activeSubscriptions,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        popularTowns,
        monthlyRevenue,
        recentPayments
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard statistics'
    });
  }
};

// Get all users with pagination
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password -verificationToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

// Get all businesses with admin filters
exports.getAllBusinesses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      town,
      industry,
      tier,
      status,
      search
    } = req.query;

    const filter = {};
    if (town) filter.town = town;
    if (industry) filter.industry = industry;
    if (tier) filter.subscriptionTier = tier;
    if (status) filter.subscriptionStatus = status;
    if (search) {
      filter.$text = { $search: search };
    }

    const businesses = await Business.find(filter)
      .populate('owner', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Business.countDocuments(filter);

    res.json({
      success: true,
      businesses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Get all businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching businesses'
    });
  }
};

// Get all payments with filters
exports.getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      startDate,
      endDate
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.paymentType = type;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
      .populate('business', 'businessName')
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    // Calculate total amount for filtered payments
    const totalAmount = await Payment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      totalAmount: totalAmount[0]?.total || 0
    });

  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payments'
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password -verificationToken -resetPasswordToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      user
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user role'
    });
  }
};

// Update business status
exports.updateBusinessStatus = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status } = req.body;

    const business = await Business.findByIdAndUpdate(
      businessId,
      { subscriptionStatus: status },
      { new: true }
    ).populate('owner', 'firstName lastName email phone');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Update subscription status as well
    await Subscription.findOneAndUpdate(
      { business: businessId },
      { status }
    );

    res.json({
      success: true,
      message: 'Business status updated successfully',
      business
    });

  } catch (error) {
    console.error('Update business status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating business status'
    });
  }
};

// Generate financial report
exports.generateFinancialReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const report = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            paymentType: '$paymentType',
            plan: '$plan'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate totals
    const totals = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          ownerDistribution: { $sum: '$distribution.ownerAmount' },
          reserveDistribution: { $sum: '$distribution.reserveAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      report,
      totals: totals[0] || {},
      dateRange: {
        startDate: startDate || new Date(0),
        endDate: endDate || new Date()
      }
    });

  } catch (error) {
    console.error('Generate financial report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating financial report'
    });
  }
};

const express = require('express');
const {
  getDashboardStats,
  getUsers,
  getAllBusinesses,
  getAllPayments,
  updateUserRole,
  updateBusinessStatus,
  generateFinancialReport
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin privileges
router.use(protect);
router.use(admin);

router.get('/dashboard/stats', getDashboardStats);
router.get('/users', getUsers);
router.get('/businesses', getAllBusinesses);
router.get('/payments', getAllPayments);
router.put('/users/:userId/role', updateUserRole);
router.put('/businesses/:businessId/status', updateBusinessStatus);
router.get('/reports/financial', generateFinancialReport);

module.exports = router;

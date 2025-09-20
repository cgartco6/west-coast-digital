const express = require('express');
const {
  getBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  getUserBusinesses,
  generateAIContent,
  recordClick
} = require('../controllers/businessController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', getBusinesses);
router.get('/:id', getBusiness);
router.post('/:id/click', recordClick);

// Protected routes
router.use(protect);
router.get('/user/my-businesses', getUserBusinesses);
router.post('/', upload.array('images', 10), createBusiness);
router.put('/:id', upload.array('images', 10), updateBusiness);
router.delete('/:id', deleteBusiness);
router.post('/:id/generate-ai-content', generateAIContent);

module.exports = router;

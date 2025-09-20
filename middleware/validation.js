const { body, validationResult } = require('express-validator');

// Validation rules for user registration
exports.validateRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Validation rules for business creation
exports.validateBusiness = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('industry')
    .isIn(['Retail', 'Hospitality', 'Services', 'Professional', 'Manufacturing', 'Healthcare', 'Construction', 'Transport', 'Education', 'Entertainment', 'Other'])
    .withMessage('Please select a valid industry'),
  body('town')
    .isIn(['Saldanha', 'Vredenburg', 'Langebaan', 'St Helena Bay', 'Hopefield', 'Darling', 'Moorreesburg', 'Malmesbury', 'Riebeek West', 'Riebeek Kasteel', 'Yzerfontein', 'Piketberg', 'Porterville', 'Aurora', 'Redelinghuys', 'Elands Bay', 'Dwarskersbos', 'Laaiplek', 'Velddrif', 'Cape Town', 'Tableview', 'Other'])
    .withMessage('Please select a valid town'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters')
];

// Check for validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

const crypto = require('crypto');

const payfastConfig = {
  merchantId: process.env.PAYFAST_MERCHANT_ID,
  merchantKey: process.env.PAYFAST_MERCHANT_KEY,
  passPhrase: process.env.PAYFAST_PASSPHRASE,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  paymentUrl: process.env.NODE_ENV === 'production' 
    ? 'https://www.payfast.co.za/eng/process' 
    : 'https://sandbox.payfast.co.za/eng/process',
  validateUrl: process.env.NODE_ENV === 'production'
    ? 'https://www.payfast.co.za/eng/query/validate'
    : 'https://sandbox.payfast.co.za/eng/query/validate'
};

// Generate signature for PayFast
const generateSignature = (data) => {
  let pfOutput = '';
  for (let key in data) {
    if (data.hasOwnProperty(key) && data[key] !== '') {
      pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, '+')}&`;
    }
  }
  
  // Remove last ampersand
  pfOutput = pfOutput.substring(0, pfOutput.length - 1);
  
  if (payfastConfig.passPhrase) {
    pfOutput += `&passphrase=${encodeURIComponent(payfastConfig.passPhrase.trim()).replace(/%20/g, '+')}`;
  }
  
  return crypto.createHash('md5').update(pfOutput).digest('hex');
};

// Validate PayFast payment
const validatePayment = async (data) => {
  try {
    const response = await fetch(payfastConfig.validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(data).toString(),
    });
    
    const result = await response.text();
    return result === 'VALID';
  } catch (error) {
    console.error('PayFast validation error:', error);
    return false;
  }
};

module.exports = {
  ...payfastConfig,
  generateSignature,
  validatePayment
};

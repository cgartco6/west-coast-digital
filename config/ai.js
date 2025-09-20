const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const aiConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 500,
};

// AI content generation templates
const contentTemplates = {
  socialMedia: {
    facebook: "Create an engaging Facebook post for {businessName}, a {industry} business in {town}. Highlight: {description}. Include emojis and a call to action.",
    twitter: "Create a concise Twitter post for {businessName} ({industry} in {town}). Max 280 chars. Hashtags: #{industry}, #{town}, #WestCoastSA.",
    instagram: "Instagram caption for {businessName} ({industry} in {town}). Focus on visual appeal. Hashtags: #{industry}, #{town}, #WestCoastBusiness.",
    linkedin: "Professional LinkedIn post for {businessName} ({industry} in {town}). Focus on business value and expertise."
  },
  email: {
    welcome: "Welcome email for new {businessName} listing on West Coast Digital. Highlight benefits of {plan} plan.",
    payment: "Payment confirmation for {businessName}. Amount: R{amount}. Plan: {plan}.",
    renewal: "Subscription renewal reminder for {businessName}. Plan: {plan}. Renewal date: {date}."
  }
};

module.exports = {
  openai,
  aiConfig,
  contentTemplates
};

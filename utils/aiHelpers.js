const openai = require('openai');
const socialMediaService = require('./socialMediaService');

// Initialize OpenAI
openai.apiKey = process.env.OPENAI_API_KEY;

// Generate marketing content for a business
exports.generateMarketingContent = async (business) => {
  try {
    const prompt = `
      Create engaging social media content for a business called ${business.businessName} 
      that operates in the ${business.industry} industry in ${business.town}, South Africa.
      
      Business description: ${business.description}
      
      Please create content for:
      1. Facebook post (with emojis)
      2. Twitter tweet (with relevant hashtags)
      3. Instagram caption (with hashtags)
      4. LinkedIn post (professional tone)
      
      Make the content engaging and encourage people to visit or contact the business.
    `;
    
    const response = await openai.Completion.create({
      engine: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 500,
      temperature: 0.7
    });
    
    const content = response.choices[0].text.trim();
    return this.parseGeneratedContent(content);
  } catch (error) {
    console.error('Error generating marketing content:', error);
    return null;
  }
};

// Parse the generated content into different platform formats
exports.parseGeneratedContent = (content) => {
  // This is a simplified parser - you would need a more robust solution
  const platforms = ['Facebook', 'Twitter', 'Instagram', 'LinkedIn'];
  const result = {};
  
  platforms.forEach(platform => {
    const regex = new RegExp(`${platform}:[\\s\\S]*?(?=${platform}|$)`, 'i');
    const match = content.match(regex);
    
    if (match) {
      result[platform.toLowerCase()] = match[0].replace(`${platform}:`, '').trim();
    }
  });
  
  return result;
};

// Automate social media posting
exports.automateSocialMedia = async (business) => {
  try {
    const content = await this.generateMarketingContent(business);
    
    if (content) {
      // Post to each platform
      for (const [platform, text] of Object.entries(content)) {
        await socialMediaService.postToPlatform(platform, text, business);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error automating social media:', error);
    return false;
  }
};

// AI-powered customer service response
exports.generateCustomerResponse = async (query, business) => {
  try {
    const prompt = `
      You are a customer service representative for ${business.businessName}, 
      a ${business.industry} business in ${business.town}, South Africa.
      
      Customer query: "${query}"
      
      Please provide a helpful and professional response to this query.
      If the query is a complaint, apologize and offer a solution.
      If the query is asking for information, provide accurate details.
      Keep the response concise and friendly.
    `;
    
    const response = await openai.Completion.create({
      engine: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 200,
      temperature: 0.7
    });
    
    return response.choices[0].text.trim();
  } catch (error) {
    console.error('Error generating customer response:', error);
    return 'Thank you for your message. We will get back to you shortly.';
  }
};

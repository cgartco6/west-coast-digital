const { openai, aiConfig, contentTemplates } = require('../config/ai');

// Generate marketing content for a business
exports.generateMarketingContent = async (business) => {
  try {
    const prompts = {};

    // Generate prompts for each platform
    for (const [platform, template] of Object.entries(contentTemplates.socialMedia)) {
      let prompt = template
        .replace('{businessName}', business.businessName)
        .replace('{industry}', business.industry)
        .replace('{town}', business.town)
        .replace('{description}', business.description.substring(0, 200)); // Limit description length

      prompts[platform] = prompt;
    }

    const generatedContent = {};

    // Generate content for each platform
    for (const [platform, prompt] of Object.entries(prompts)) {
      try {
        const response = await openai.chat.completions.create({
          model: aiConfig.model,
          messages: [
            {
              role: 'system',
              content: 'You are a creative marketing assistant specializing in local business promotion in South Africa.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: aiConfig.maxTokens,
          temperature: aiConfig.temperature
        });

        generatedContent[platform] = response.choices[0].message.content.trim();
      } catch (error) {
        console.error(`Error generating ${platform} content:`, error);
        generatedContent[platform] = this.getFallbackContent(platform, business);
      }
    }

    return generatedContent;

  } catch (error) {
    console.error('AI content generation error:', error);
    return this.getFallbackContent('all', business);
  }
};

// Fallback content if AI fails
exports.getFallbackContent = (platform, business) => {
  const baseContent = `Check out ${business.businessName} - ${business.description.substring(0, 100)}... Visit us in ${business.town}! #WestCoastSA #${business.industry}`;
  
  const platformSpecific = {
    facebook: `🌟 ${baseContent} 👍 Like and share for more updates!`,
    twitter: `${baseContent.substring(0, 270)}...`,
    instagram: `✨ ${baseContent} 📸 Follow us for more!`,
    linkedin: `We're excited to share that ${business.businessName} is now listed on West Coast Digital. ${baseContent} #Business #Professional`
  };

  return platformSpecific[platform] || baseContent;
};

// Automate social media posting
exports.automateSocialMedia = async (business) => {
  try {
    const content = await this.generateMarketingContent(business);
    
    // In a real implementation, you would integrate with social media APIs here
    // For now, we'll simulate the posting and return the content
    
    const postResults = {};
    const socialMediaApis = {
      facebook: this.postToFacebook,
      twitter: this.postToTwitter,
      instagram: this.postToInstagram,
      linkedin: this.postToLinkedIn
    };

    for (const [platform, contentText] of Object.entries(content)) {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In real implementation: await socialMediaApis[platform](contentText, business);
        postResults[platform] = {
          success: true,
          message: `Content scheduled for ${platform}`,
          content: contentText.substring(0, 100) + '...'
        };
      } catch (error) {
        postResults[platform] = {
          success: false,
          error: error.message,
          platform
        };
      }
    }

    return {
      success: true,
      results: postResults,
      generatedContent: content
    };

  } catch (error) {
    console.error('Social media automation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// AI-powered customer service response
exports.generateCustomerResponse = async (query, business, context = {}) => {
  try {
    const prompt = `
      You are a customer service representative for ${business.businessName}, 
      a ${business.industry} business located in ${business.town}, South Africa.
      
      Customer query: "${query}"
      
      Context: ${JSON.stringify(context)}
      
      Please provide a helpful, professional, and friendly response in English.
      If the query is a complaint, apologize sincerely and offer a solution.
      If the query is asking for information, provide accurate and detailed information.
      If you need more information, politely ask for clarification.
      Keep the response concise (2-3 paragraphs maximum).
      Sign off appropriately for a South African business.
    `;

    const response = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful customer service representative for a South African business.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error('Customer response generation error:', error);
    return `Thank you for your message. Our team at ${business.businessName} will get back to you shortly. For immediate assistance, please call us at ${business.phone}.`;
  }
};

// Generate email content
exports.generateEmailContent = async (templateType, data) => {
  try {
    const template = contentTemplates.email[templateType];
    if (!template) {
      throw new Error(`Email template ${templateType} not found`);
    }

    let prompt = template;
    for (const [key, value] of Object.entries(data)) {
      prompt = prompt.replace(`{${key}}`, value);
    }

    const response = await openai.chat.completions.create({
      model: aiConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional email copywriter for a business directory service in South Africa.'
        },
        {
          role: 'user',
          content: `Write a professional email using this template: ${prompt}`
        }
      ],
      max_tokens: 500,
      temperature: 0.5
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error('Email content generation error:', error);
    return this.getFallbackEmail(templateType, data);
  }
};

// Fallback email templates
exports.getFallbackEmail = (templateType, data) => {
  const templates = {
    welcome: `
      Welcome to West Coast Digital, ${data.businessName}!
      
      Thank you for choosing our ${data.plan} plan. We're excited to help your business grow.
      
      Your listing is now active and visible to potential customers across the West Coast region.
      
      Best regards,
      The West Coast Digital Team
    `,
    payment: `
      Payment Confirmation
      
      Dear ${data.businessName},
      
      We've successfully processed your payment of R${data.amount} for your ${data.plan} subscription.
      
      Transaction ID: ${data.transactionId}
      Payment Date: ${new Date().toLocaleDateString()}
      
      Thank you for your business!
      
      Sincerely,
      West Coast Digital
    `,
    renewal: `
      Subscription Renewal Reminder
      
      Hello ${data.businessName},
      
      Your ${data.plan} subscription is due for renewal on ${data.date}.
      
      To ensure uninterrupted service, please renew your subscription before the due date.
      
      Thank you for being a valued member

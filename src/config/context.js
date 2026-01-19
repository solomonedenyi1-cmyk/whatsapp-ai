/**
 * AI Assistant Context Configuration
 * 
 * This file loads the AI's persona, knowledge base, and behavior from config.json
 * Edit config.json in the root directory to customize your AI assistant.
 */

const fs = require('fs');
const path = require('path');

let businessContext = {};

/**
 * Load configuration from config.json
 */
function loadConfig() {
  try {
    const configPath = path.join(__dirname, '../../config.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);

    // Transform JSON config to internal format
    businessContext = {
      identity: {
        name: config.ai_identity.name,
        gender: config.ai_identity.gender,
        role: config.ai_identity.role,
        personality: config.ai_identity.personality,
        language: config.ai_identity.language,
        tone: config.ai_identity.tone
      },
      business: {
        name: config.business.name,
        description: config.business.description,
        website: config.business.website,
        email: config.business.email,
        phone: config.business.phone,
        address: config.business.address,
        workingHours: config.business.working_hours,
        services: config.services || [],
        products: config.products || [],
        faq: config.faq || []
      },
      owner: config.owner,
      capabilities: config.capabilities || [],
      limitations: config.limitations || [],
      standardResponses: {
        greeting: config.standard_responses.greeting.replace('{name}', config.ai_identity.name),
        goodbye: config.standard_responses.goodbye,
        unavailable: config.standard_responses.unavailable,
        businessHours: config.standard_responses.business_hours.replace('{working_hours}', config.business.working_hours),
        emergency: config.standard_responses.emergency.replace('{phone}', config.business.phone)
      }
    };

    console.log(`✅ Configuration loaded successfully for ${businessContext.identity.name}`);
    return businessContext;

  } catch (error) {
    console.error('❌ Error loading config.json:', error.message);
    console.log('📝 Using default configuration. Please check your config.json file.');

    // Fallback to default configuration
    businessContext = getDefaultConfig();
    return businessContext;
  }
}

/**
 * Get default configuration if config.json fails to load
 * This mirrors the structure of config.json to avoid duplication
 */
function getDefaultConfig() {
  const defaultConfig = {
    ai_identity: {
      name: "Mistral Assistant",
      gender: "female",
      role: "AI Assistant",
      personality: "friendly, professional, and helpful",
      language: "Portuguese (Brazilian)",
      tone: "professional but approachable"
    },
    business: {
      name: "Your Company Name",
      description: "Please edit config.json to add your business information",
      website: "https://yourwebsite.com",
      email: "contact@yourcompany.com",
      phone: "+55 11 99999-9999",
      address: "Your business address",
      working_hours: "Monday to Friday, 9 AM to 6 PM (GMT-3)"
    },
    services: [],
    products: [],
    owner: {
      name: "Your Name",
      title: "Owner",
      bio: "Please edit config.json to add your information",
      experience: "Please add your experience",
      specialties: []
    },
    faq: [],
    capabilities: ["Answer basic questions", "Provide company information"],
    limitations: ["Cannot process payments", "Cannot access external systems"],
    standard_responses: {
      greeting: "Hello! I'm {name}, your AI assistant. How can I help you today?",
      goodbye: "Thank you for contacting us! Have a great day!",
      unavailable: "I'm sorry, I don't have that information right now.",
      business_hours: "Please check our business hours in the configuration.",
      emergency: "For urgent matters, please contact us directly."
    }
  };

  // Transform to internal format using the same logic as loadConfig
  return {
    identity: {
      name: defaultConfig.ai_identity.name,
      gender: defaultConfig.ai_identity.gender,
      role: defaultConfig.ai_identity.role,
      personality: defaultConfig.ai_identity.personality,
      language: defaultConfig.ai_identity.language,
      tone: defaultConfig.ai_identity.tone
    },
    business: {
      name: defaultConfig.business.name,
      description: defaultConfig.business.description,
      website: defaultConfig.business.website,
      email: defaultConfig.business.email,
      phone: defaultConfig.business.phone,
      address: defaultConfig.business.address,
      workingHours: defaultConfig.business.working_hours,
      services: defaultConfig.services || [],
      products: defaultConfig.products || [],
      faq: defaultConfig.faq || []
    },
    owner: defaultConfig.owner,
    capabilities: defaultConfig.capabilities || [],
    limitations: defaultConfig.limitations || [],
    standardResponses: {
      greeting: defaultConfig.standard_responses.greeting.replace('{name}', defaultConfig.ai_identity.name),
      goodbye: defaultConfig.standard_responses.goodbye,
      unavailable: defaultConfig.standard_responses.unavailable,
      businessHours: defaultConfig.standard_responses.business_hours.replace('{working_hours}', defaultConfig.business.working_hours),
      emergency: defaultConfig.standard_responses.emergency.replace('{phone}', defaultConfig.business.phone)
    }
  };
}

// Load configuration on module initialization
loadConfig();

module.exports = {
  businessContext,
};

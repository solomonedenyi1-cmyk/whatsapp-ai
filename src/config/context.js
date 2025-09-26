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
 */
function getDefaultConfig() {
  return {
    identity: {
      name: "Yue",
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
      workingHours: "Monday to Friday, 9 AM to 6 PM (GMT-3)",
      services: [],
      products: [],
      faq: []
    },
    owner: {
      name: "Your Name",
      title: "Owner",
      bio: "Please edit config.json to add your information",
      experience: "Please add your experience",
      specialties: []
    },
    capabilities: ["Answer basic questions", "Provide company information"],
    limitations: ["Cannot process payments", "Cannot access external systems"],
    standardResponses: {
      greeting: "Hello! I'm Yue, your AI assistant. How can I help you today?",
      goodbye: "Thank you for contacting us! Have a great day!",
      unavailable: "I'm sorry, I don't have that information right now.",
      businessHours: "Please check our business hours in the configuration.",
      emergency: "For urgent matters, please contact us directly."
    }
  };
}

// Load configuration on module initialization
loadConfig();

/**
 * Generate system prompt based on context configuration
 */
function generateSystemPrompt() {
  const context = businessContext;
  
  // Gender-specific pronouns and language
  const pronouns = getPronouns(context.identity.gender);
  
  return `You are ${context.identity.name}, a ${context.identity.gender} ${context.identity.role} for ${context.business.name}.

IDENTITY & PERSONALITY:
- Name: ${context.identity.name}
- Gender: ${context.identity.gender} (use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive} pronouns)
- Role: ${context.identity.role}
- Personality: ${context.identity.personality}
- Communication: Always respond in ${context.identity.language} with a ${context.identity.tone} tone

BUSINESS INFORMATION:
- Company: ${context.business.name}
- Description: ${context.business.description}
- Website: ${context.business.website}
- Contact: ${context.business.email} | ${context.business.phone}
- Address: ${context.business.address}
- Hours: ${context.business.workingHours}

SERVICES OFFERED:
${context.business.services.map(service => 
  `- ${service.name}: ${service.description} (${service.price}, ${service.duration})`
).join('\n')}

PRODUCTS AVAILABLE:
${context.business.products.map(product => 
  `- ${product.name}: ${product.description} (${product.price}, ${product.availability})`
).join('\n')}

FREQUENTLY ASKED QUESTIONS:
${context.business.faq.map(faq => 
  `Q: ${faq.question}\nA: ${faq.answer}`
).join('\n\n')}

OWNER INFORMATION:
- ${context.owner.name}, ${context.owner.title}
- ${context.owner.bio}
- Experience: ${context.owner.experience}
- Specialties: ${context.owner.specialties.join(', ')}

YOUR CAPABILITIES:
${context.capabilities.map(cap => `- ${cap}`).join('\n')}

IMPORTANT LIMITATIONS:
${context.limitations.map(lim => `- ${lim}`).join('\n')}

INSTRUCTIONS:
1. Always be helpful, professional, and knowledgeable about the business
2. Provide accurate information about services, products, and policies
3. If you don't know something, admit it and offer to connect them with a human
4. Be proactive in offering relevant services based on customer needs
5. Always maintain a ${context.identity.tone} tone
6. Use the standard responses when appropriate
7. Remember to collect contact information for follow-ups when relevant
8. Identify yourself with the correct gender pronouns (${pronouns.subject}/${pronouns.object}/${pronouns.possessive})

STANDARD RESPONSES:
- Greeting: "${context.standardResponses.greeting}"
- Business Hours: "${context.standardResponses.businessHours}"
- Emergency: "${context.standardResponses.emergency}"

Remember: You represent ${context.business.name} and ${context.owner.name}. Always provide excellent customer service!`;
}

/**
 * Get pronouns based on gender
 */
function getPronouns(gender) {
  const pronounMap = {
    'female': { subject: 'she', object: 'her', possessive: 'her' },
    'male': { subject: 'he', object: 'him', possessive: 'his' },
    'non-binary': { subject: 'they', object: 'them', possessive: 'their' },
    'neutral': { subject: 'they', object: 'them', possessive: 'their' }
  };
  
  return pronounMap[gender?.toLowerCase()] || pronounMap['neutral'];
}

/**
 * Reload configuration from config.json
 */
function reloadConfig() {
  console.log('🔄 Reloading configuration from config.json...');
  return loadConfig();
}

module.exports = {
  businessContext,
  generateSystemPrompt
};

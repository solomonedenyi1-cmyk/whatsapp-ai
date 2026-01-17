// Configuration Management for WhatsApp AI Bot
// This package handles environment variables, business context, and system configuration

import { z } from "zod";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Environment configuration schema
const EnvConfigSchema = z.object({
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  debug: z.boolean().default(false),
  mistralApiKey: z.string().optional(),
  whatsappSessionPath: z.string().default("./session"),
  maxContextMessages: z.number().default(20),
  messageSplitLength: z.number().default(1500),
  adminWhatsAppNumber: z.string().default("551234567890@c.us")
});

type EnvConfig = z.infer<typeof EnvConfigSchema>;

// Business context schema
const BusinessContextSchema = z.object({
  identity: z.object({
    name: z.string(),
    gender: z.string(),
    role: z.string(),
    personality: z.string(),
    language: z.string(),
    tone: z.string()
  }),
  business: z.object({
    name: z.string(),
    description: z.string(),
    website: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    workingHours: z.string(),
    services: z.array(z.object({
      name: z.string(),
      description: z.string(),
      price: z.string(),
      duration: z.string()
    })).default([]),
    products: z.array(z.object({
      name: z.string(),
      description: z.string(),
      price: z.string(),
      availability: z.string()
    })).default([]),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).default([])
  }),
  owner: z.object({
    name: z.string(),
    title: z.string(),
    bio: z.string(),
    experience: z.string(),
    specialties: z.array(z.string())
  }),
  capabilities: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  standardResponses: z.object({
    greeting: z.string(),
    goodbye: z.string(),
    unavailable: z.string(),
    businessHours: z.string(),
    emergency: z.string()
  })
});

type BusinessContext = z.infer<typeof BusinessContextSchema>;

// System prompt configuration schema
const SystemPromptConfigSchema = z.object({
  instructions: z.array(z.string()).default([]),
  sections: z.object({
    identity_header: z.string().default("IDENTITY & PERSONALITY:"),
    business_header: z.string().default("BUSINESS INFORMATION:"),
    services_header: z.string().default("SERVICES OFFERED:"),
    products_header: z.string().default("PRODUTOS AVAILABLE:"),
    faq_header: z.string().default("FREQUENTLY ASKED QUESTIONS:"),
    owner_header: z.string().default("OWNER INFORMATION:"),
    capabilities_header: z.string().default("YOUR CAPABILITIES:"),
    limitations_header: z.string().default("IMPORTANT LIMITATIONS:"),
    instructions_header: z.string().default("INSTRUCTIONS:"),
    responses_header: z.string().default("STANDARD RESPONSES:"),
    closing_message: z.string().default("Remember: You represent {business_name} and {owner_name}!")
  }),
  pronouns: z.object({
    female: z.object({
      subject: z.string(),
      object: z.string(),
      possessive: z.string()
    }),
    male: z.object({
      subject: z.string(),
      object: z.string(),
      possessive: z.string()
    }),
    "non-binary": z.object({
      subject: z.string(),
      object: z.string(),
      possessive: z.string()
    }),
    neutral: z.object({
      subject: z.string(),
      object: z.string(),
      possessive: z.string()
    })
  })
});

type SystemPromptConfig = z.infer<typeof SystemPromptConfigSchema>;

// Complete configuration schema
const CompleteConfigSchema = z.object({
  env: EnvConfigSchema,
  businessContext: BusinessContextSchema,
  systemPrompt: SystemPromptConfigSchema
});

type CompleteConfig = z.infer<typeof CompleteConfigSchema>;

export class ConfigManager {
  private envConfig: EnvConfig;
  private businessContext: BusinessContext;
  private systemPromptConfig: SystemPromptConfig;
  private configPath: string;

  constructor() {
    // Load environment configuration
    this.envConfig = this.loadEnvConfig();
    this.configPath = path.join(__dirname, "../../../../config.json");
    
    // Load business context and system prompt
    const { businessContext, systemPrompt } = this.loadBusinessConfig();
    this.businessContext = businessContext;
    this.systemPromptConfig = systemPrompt;
  }

  /**
   * Load environment configuration from .env file
   */
  private loadEnvConfig(): EnvConfig {
    return EnvConfigSchema.parse({
      nodeEnv: process.env.NODE_ENV,
      debug: process.env.DEBUG === "true",
      mistralApiKey: process.env.MISTRAL_API_KEY,
      whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || "./session",
      maxContextMessages: process.env.MAX_CONTEXT_MESSAGES 
        ? parseInt(process.env.MAX_CONTEXT_MESSAGES)
        : 20,
      messageSplitLength: process.env.MESSAGE_SPLIT_LENGTH
        ? parseInt(process.env.MESSAGE_SPLIT_LENGTH)
        : 1500,
      adminWhatsAppNumber: process.env.ADMIN_WHATSAPP_NUMBER || "551234567890@c.us"
    });
  }

  /**
   * Load business configuration from config.json
   */
  private loadBusinessConfig(): { businessContext: BusinessContext; systemPrompt: SystemPromptConfig } {
    try {
      const configData = fs.readFileSync(this.configPath, "utf8");
      const rawConfig = JSON.parse(configData);

      // Transform raw config to our schemas
      const businessContext = BusinessContextSchema.parse({
        identity: rawConfig.ai_identity,
        business: {
          ...rawConfig.business,
          services: rawConfig.services || [],
          products: rawConfig.products || [],
          faq: rawConfig.faq || []
        },
        owner: rawConfig.owner,
        capabilities: rawConfig.capabilities || [],
        limitations: rawConfig.limitations || [],
        standardResponses: {
          greeting: rawConfig.standard_responses.greeting.replace('{name}', rawConfig.ai_identity.name),
          goodbye: rawConfig.standard_responses.goodbye,
          unavailable: rawConfig.standard_responses.unavailable,
          businessHours: rawConfig.standard_responses.business_hours.replace('{working_hours}', rawConfig.business.working_hours),
          emergency: rawConfig.standard_responses.emergency.replace('{phone}', rawConfig.business.phone)
        }
      });

      const systemPrompt = SystemPromptConfigSchema.parse(
        rawConfig.system_prompt || this.getDefaultSystemPrompt()
      );

      console.log("✅ Configuration loaded successfully");
      return { businessContext, systemPrompt };
    } catch (error) {
      console.error("❌ Error loading config.json:", error);
      console.log("📝 Using default configuration");
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default system prompt configuration
   */
  private getDefaultSystemPrompt(): SystemPromptConfig {
    return {
      instructions: [
        "Always be helpful, professional, and knowledgeable about the business",
        "Provide accurate information about services, products, and policies",
        "If you don't know something, admit it and offer to connect them with a human",
        "Be proactive in offering relevant services based on customer needs"
      ],
      sections: {
        identity_header: "IDENTITY & PERSONALITY:",
        business_header: "BUSINESS INFORMATION:",
        services_header: "SERVICES OFFERED:",
        products_header: "PRODUTOS AVAILABLE:",
        faq_header: "FREQUENTLY ASKED QUESTIONS:",
        owner_header: "OWNER INFORMATION:",
        capabilities_header: "YOUR CAPABILITIES:",
        limitations_header: "IMPORTANT LIMITATIONS:",
        instructions_header: "INSTRUCTIONS:",
        responses_header: "STANDARD RESPONSES:",
        closing_message: "Remember: You represent {business_name} and {owner_name}!"
      },
      pronouns: {
        female: { subject: "she", object: "her", possessive: "her" },
        male: { subject: "he", object: "him", possessive: "his" },
        "non-binary": { subject: "they", object: "them", possessive: "their" },
        neutral: { subject: "they", object: "them", possessive: "their" }
      }
    };
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): { businessContext: BusinessContext; systemPrompt: SystemPromptConfig } {
    const defaultBusinessContext: BusinessContext = {
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
        businessHours: "Our business hours are Monday to Friday, 9 AM to 6 PM (GMT-3).",
        emergency: "For urgent matters, please contact us directly."
      }
    };

    return {
      businessContext: defaultBusinessContext,
      systemPrompt: this.getDefaultSystemPrompt()
    };
  }

  /**
   * Generate system prompt for AI
   */
  generateSystemPrompt(): string {
    const context = this.businessContext;
    const config = this.systemPromptConfig;
    
    // Gender-specific pronouns
    const pronouns = config.pronouns[context.identity.gender?.toLowerCase() as keyof typeof config.pronouns] 
      || config.pronouns.neutral;

    return `You are ${context.identity.name}, a ${context.identity.gender} ${context.identity.role} for ${context.business.name}.

${config.sections.identity_header}
- Name: ${context.identity.name}
- Gender: ${context.identity.gender} (use ${pronouns.subject}/${pronouns.object}/${pronouns.possessive} pronouns)
- Role: ${context.identity.role}
- Personality: ${context.identity.personality}
- Communication: Always respond in ${context.identity.language} with a ${context.identity.tone} tone

${config.sections.business_header}
- Company: ${context.business.name}
- Description: ${context.business.description}
- Website: ${context.business.website}
- Contact: ${context.business.email} | ${context.business.phone}
- Address: ${context.business.address}
- Hours: ${context.business.workingHours}

${config.sections.services_header}
${context.business.services.map(service => 
  `- ${service.name}: ${service.description} (${service.price}, ${service.duration})`
).join('\n')}

${config.sections.products_header}
${context.business.products.map(product => 
  `- ${product.name}: ${product.description} (${product.price}, ${product.availability})`
).join('\n')}

${config.sections.faq_header}
${context.business.faq.map(faq => 
  `Q: ${faq.question}\nA: ${faq.answer}`
).join('\n\n')}

${config.sections.owner_header}
- ${context.owner.name}, ${context.owner.title}
- ${context.owner.bio}
- Experience: ${context.owner.experience}
- Specialties: ${context.owner.specialties.join(', ')}

${config.sections.capabilities_header}
${context.capabilities.map(cap => `- ${cap}`).join('\n')}

${config.sections.limitations_header}
${context.limitations.map(lim => `- ${lim}`).join('\n')}

${config.sections.instructions_header}
${config.instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n')}

${config.sections.responses_header}
- Greeting: "${context.standardResponses.greeting}"
- Business Hours: "${context.standardResponses.businessHours}"
- Emergency: "${context.standardResponses.emergency}"

${config.sections.closing_message.replace('{business_name}', context.business.name).replace('{owner_name}', context.owner.name)}`;
  }

  /**
   * Reload configuration from config.json
   */
  reloadConfig(): void {
    console.log("🔄 Reloading configuration from config.json...");
    const { businessContext, systemPrompt } = this.loadBusinessConfig();
    this.businessContext = businessContext;
    this.systemPromptConfig = systemPrompt;
  }

  /**
   * Get environment configuration
   */
  getEnvConfig(): EnvConfig {
    return this.envConfig;
  }

  /**
   * Get business context
   */
  getBusinessContext(): BusinessContext {
    return this.businessContext;
  }

  /**
   * Get system prompt configuration
   */
  getSystemPromptConfig(): SystemPromptConfig {
    return this.systemPromptConfig;
  }

  /**
   * Get complete configuration
   */
  getCompleteConfig(): CompleteConfig {
    return {
      env: this.envConfig,
      businessContext: this.businessContext,
      systemPrompt: this.systemPromptConfig
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();

// Export types for external use
export type { EnvConfig, BusinessContext, SystemPromptConfig, CompleteConfig };
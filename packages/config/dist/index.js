"use strict";
// Configuration Management for WhatsApp AI Bot
// This package handles environment variables, business context, and system configuration
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigManager = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
// Environment configuration schema
const EnvConfigSchema = zod_1.z.object({
    nodeEnv: zod_1.z.enum(["development", "production", "test"]).default("development"),
    debug: zod_1.z.boolean().default(false),
    mistralApiKey: zod_1.z.string().optional(),
    whatsappSessionPath: zod_1.z.string().default("./session"),
    maxContextMessages: zod_1.z.number().default(20),
    messageSplitLength: zod_1.z.number().default(1500),
    adminWhatsAppNumber: zod_1.z.string().default("551234567890@c.us")
});
// Business context schema
const BusinessContextSchema = zod_1.z.object({
    identity: zod_1.z.object({
        name: zod_1.z.string(),
        gender: zod_1.z.string(),
        role: zod_1.z.string(),
        personality: zod_1.z.string(),
        language: zod_1.z.string(),
        tone: zod_1.z.string()
    }),
    business: zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        website: zod_1.z.string(),
        email: zod_1.z.string(),
        phone: zod_1.z.string(),
        address: zod_1.z.string(),
        workingHours: zod_1.z.string(),
        services: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            price: zod_1.z.string(),
            duration: zod_1.z.string()
        })).default([]),
        products: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            price: zod_1.z.string(),
            availability: zod_1.z.string()
        })).default([]),
        faq: zod_1.z.array(zod_1.z.object({
            question: zod_1.z.string(),
            answer: zod_1.z.string()
        })).default([])
    }),
    owner: zod_1.z.object({
        name: zod_1.z.string(),
        title: zod_1.z.string(),
        bio: zod_1.z.string(),
        experience: zod_1.z.string(),
        specialties: zod_1.z.array(zod_1.z.string())
    }),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    limitations: zod_1.z.array(zod_1.z.string()).default([]),
    standardResponses: zod_1.z.object({
        greeting: zod_1.z.string(),
        goodbye: zod_1.z.string(),
        unavailable: zod_1.z.string(),
        businessHours: zod_1.z.string(),
        emergency: zod_1.z.string()
    })
});
// System prompt configuration schema
const SystemPromptConfigSchema = zod_1.z.object({
    instructions: zod_1.z.array(zod_1.z.string()).default([]),
    sections: zod_1.z.object({
        identity_header: zod_1.z.string().default("IDENTITY & PERSONALITY:"),
        business_header: zod_1.z.string().default("BUSINESS INFORMATION:"),
        services_header: zod_1.z.string().default("SERVICES OFFERED:"),
        products_header: zod_1.z.string().default("PRODUTOS AVAILABLE:"),
        faq_header: zod_1.z.string().default("FREQUENTLY ASKED QUESTIONS:"),
        owner_header: zod_1.z.string().default("OWNER INFORMATION:"),
        capabilities_header: zod_1.z.string().default("YOUR CAPABILITIES:"),
        limitations_header: zod_1.z.string().default("IMPORTANT LIMITATIONS:"),
        instructions_header: zod_1.z.string().default("INSTRUCTIONS:"),
        responses_header: zod_1.z.string().default("STANDARD RESPONSES:"),
        closing_message: zod_1.z.string().default("Remember: You represent {business_name} and {owner_name}!")
    }),
    pronouns: zod_1.z.object({
        female: zod_1.z.object({
            subject: zod_1.z.string(),
            object: zod_1.z.string(),
            possessive: zod_1.z.string()
        }),
        male: zod_1.z.object({
            subject: zod_1.z.string(),
            object: zod_1.z.string(),
            possessive: zod_1.z.string()
        }),
        "non-binary": zod_1.z.object({
            subject: zod_1.z.string(),
            object: zod_1.z.string(),
            possessive: zod_1.z.string()
        }),
        neutral: zod_1.z.object({
            subject: zod_1.z.string(),
            object: zod_1.z.string(),
            possessive: zod_1.z.string()
        })
    })
});
// Complete configuration schema
const CompleteConfigSchema = zod_1.z.object({
    env: EnvConfigSchema,
    businessContext: BusinessContextSchema,
    systemPrompt: SystemPromptConfigSchema
});
class ConfigManager {
    constructor() {
        // Load environment configuration
        this.envConfig = this.loadEnvConfig();
        this.configPath = path_1.default.join(__dirname, "../../../../config.json");
        // Load business context and system prompt
        const { businessContext, systemPrompt } = this.loadBusinessConfig();
        this.businessContext = businessContext;
        this.systemPromptConfig = systemPrompt;
    }
    /**
     * Load environment configuration from .env file
     */
    loadEnvConfig() {
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
    loadBusinessConfig() {
        try {
            const configData = fs_1.default.readFileSync(this.configPath, "utf8");
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
            const systemPrompt = SystemPromptConfigSchema.parse(rawConfig.system_prompt || this.getDefaultSystemPrompt());
            console.log("✅ Configuration loaded successfully");
            return { businessContext, systemPrompt };
        }
        catch (error) {
            console.error("❌ Error loading config.json:", error);
            console.log("📝 Using default configuration");
            return this.getDefaultConfig();
        }
    }
    /**
     * Get default system prompt configuration
     */
    getDefaultSystemPrompt() {
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
    getDefaultConfig() {
        const defaultBusinessContext = {
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
    generateSystemPrompt() {
        const context = this.businessContext;
        const config = this.systemPromptConfig;
        // Gender-specific pronouns
        const pronouns = config.pronouns[context.identity.gender?.toLowerCase()]
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
${context.business.services.map(service => `- ${service.name}: ${service.description} (${service.price}, ${service.duration})`).join('\n')}

${config.sections.products_header}
${context.business.products.map(product => `- ${product.name}: ${product.description} (${product.price}, ${product.availability})`).join('\n')}

${config.sections.faq_header}
${context.business.faq.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

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
    reloadConfig() {
        console.log("🔄 Reloading configuration from config.json...");
        const { businessContext, systemPrompt } = this.loadBusinessConfig();
        this.businessContext = businessContext;
        this.systemPromptConfig = systemPrompt;
    }
    /**
     * Get environment configuration
     */
    getEnvConfig() {
        return this.envConfig;
    }
    /**
     * Get business context
     */
    getBusinessContext() {
        return this.businessContext;
    }
    /**
     * Get system prompt configuration
     */
    getSystemPromptConfig() {
        return this.systemPromptConfig;
    }
    /**
     * Get complete configuration
     */
    getCompleteConfig() {
        return {
            env: this.envConfig,
            businessContext: this.businessContext,
            systemPrompt: this.systemPromptConfig
        };
    }
}
exports.ConfigManager = ConfigManager;
// Export singleton instance
exports.configManager = new ConfigManager();

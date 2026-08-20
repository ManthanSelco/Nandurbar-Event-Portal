import dotenv from "dotenv";

dotenv.config();

const parseJsonObject = (value, fallback = {}) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
};

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",

  frontendUrl:
    process.env.FRONTEND_URL || "http://localhost:5173",

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },

  emailFrom: process.env.EMAIL_FROM,

  twoFactor: {
    apiKey: process.env.TWOFACTOR_API_KEY,
    otpValidity: Number(process.env.TWOFACTOR_OTP_VALIDITY || 600),
  },

  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED === "true",
    provider: (process.env.WHATSAPP_PROVIDER || "gupshup").toLowerCase(),

    // Gupshup WhatsApp Self-Serve / CAPI
    gupshupApiKey: process.env.GUPSHUP_API_KEY,
    gupshupAppName: process.env.GUPSHUP_APP_NAME,
    gupshupSource: process.env.GUPSHUP_SOURCE,
    gupshupWelcomeTemplateId: process.env.GUPSHUP_WELCOME_TEMPLATE_ID || process.env.WHATSAPP_WELCOME_TEMPLATE_ID || "",
    gupshupApiBaseUrl: process.env.GUPSHUP_API_BASE_URL || "https://api.gupshup.io",
    gupshupWebhookSecret: process.env.GUPSHUP_WEBHOOK_SECRET,

    // Legacy TryowBot / Meta compatibility
    appId: process.env.WHATSAPP_APP_ID,
    apiKey: process.env.WHATSAPP_API_KEY,
    apiName: process.env.WHATSAPP_API_NAME,
    welcomeApiNames: parseJsonObject(process.env.WHATSAPP_WELCOME_API_NAMES),
    apiUrl: process.env.WHATSAPP_API_URL || "https://web.tryowbot.com/api/v1/send",
    receiveApiUrl: process.env.WHATSAPP_RECEIVE_API_URL || "https://web.tryowbot.com/api/v1/receive",
    receiveMethod: (process.env.WHATSAPP_RECEIVE_METHOD || "GET").toUpperCase(),
    receiveEnabled: process.env.WHATSAPP_RECEIVE_ENABLED !== "false",
    pollIntervalMs: Number(process.env.WHATSAPP_POLL_INTERVAL_MS || 30000),
    receiveLimit: Number(process.env.WHATSAPP_RECEIVE_LIMIT || 25),
    receiveLookbackDays: Number(process.env.WHATSAPP_RECEIVE_LOOKBACK_DAYS || 1),
    receiveMobile: process.env.WHATSAPP_RECEIVE_MOBILE || "",
    receiveAllParticipants: process.env.WHATSAPP_RECEIVE_ALL_PARTICIPANTS === "true",
    receiveBatchSize: Number(process.env.WHATSAPP_RECEIVE_BATCH_SIZE || 50),

    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v23.0",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,

    templateName: process.env.WHATSAPP_TEMPLATE_NAME || process.env.WHATSAPP_WELCOME_TEMPLATE_NAME,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || process.env.WHATSAPP_WELCOME_TEMPLATE_LANGUAGE || "mr",
    welcomeTemplateName: process.env.WHATSAPP_WELCOME_TEMPLATE_NAME || process.env.WHATSAPP_TEMPLATE_NAME,
    welcomeTemplateLanguage: process.env.WHATSAPP_WELCOME_TEMPLATE_LANGUAGE || process.env.WHATSAPP_TEMPLATE_LANGUAGE || "mr",
    welcomeTemplateVariables: (process.env.WHATSAPP_WELCOME_TEMPLATE_VARIABLES || "").split(",").map((item) => item.trim()).filter(Boolean),
    welcomeTemplateNames: parseJsonObject(process.env.WHATSAPP_WELCOME_TEMPLATE_NAMES),
    postEventTemplateNames: parseJsonObject(process.env.WHATSAPP_POST_EVENT_TEMPLATE_NAMES),
    postEventTemplateName: process.env.WHATSAPP_POST_EVENT_TEMPLATE_NAME,
    gupshupPostEventTemplateId: process.env.GUPSHUP_POST_EVENT_TEMPLATE_ID || process.env.WHATSAPP_POST_EVENT_TEMPLATE_ID || "",
    postEventTemplateLanguage: process.env.WHATSAPP_POST_EVENT_TEMPLATE_LANGUAGE || "mr",
    postEventTemplateVariables: (process.env.WHATSAPP_POST_EVENT_TEMPLATE_VARIABLES || "").split(",").map((item) => item.trim()).filter(Boolean),
    eventName: process.env.WHATSAPP_EVENT_NAME || "Nandurbar Event",
    statusTemplateApiName: process.env.WHATSAPP_STATUS_TEMPLATE_API_NAME,
    statusTemplateVariables: (process.env.WHATSAPP_STATUS_TEMPLATE_VARIABLES || "").split(",").map((item) => item.trim()).filter(Boolean),
  },

  googleTranslate: {
    enabled: process.env.GOOGLE_TRANSLATE_ENABLED === "true",
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
  },

  registration: {
    supportedLanguages: ["en", "hi", "mr", "gu"],
    defaultLanguage: process.env.DEFAULT_LANGUAGE || "mr",
  },

  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    mobile: process.env.ADMIN_MOBILE,
  },
};

const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "ADMIN_MOBILE",
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export default env;

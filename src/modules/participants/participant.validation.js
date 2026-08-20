import { z } from "zod";

const mobileRegex = /^[0-9]{10}$/;
const countryCodeRegex = /^\+\d{1,4}$/;

const answerSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  answer: z.string().trim(),
});

/*
|--------------------------------------------------------------------------
| Public QR Registration - final profile
| Mobile/countryCode are intentionally NOT accepted here.
| They come only from the verified OTP session.
|--------------------------------------------------------------------------
*/
export const createParticipantSchema = z.object({
  requestId: z.string().trim().min(16).max(100),
  mobile: z.string().trim().regex(mobileRegex, "Mobile number must contain exactly 10 digits"),
  countryCode: z.string().trim().regex(countryCodeRegex, "Invalid country code").default("+91"),
  preferredLanguage: z.enum(["en", "hi", "mr", "gu"]).default("mr"),
  name: z.string().trim().min(2).max(100),

  gender: z.enum([
    "MALE",
    "FEMALE",
    "OTHER",
    "PREFER_NOT_TO_SAY",
  ]),

  location: z.string().trim().min(2).max(200),

  organizationType: z.enum([
    "INDIVIDUAL_ENTREPRENEUR",
    "SHG",
    "FPO_FPC",
    "COOPERATIVE",
    "NGO",
    "GOVERNMENT",
    "PRIVATE_COMPANY",
    "OTHER",
  ]),

  organizationName: z.string().trim().min(1).max(200),

  sector: z.enum([
    "FOOD_PROCESSING",
    "AGRICULTURE",
    "LIVESTOCK",
    "RETAIL_SERVICES",
    "MANUFACTURING",
    "OTHER",
  ]),

  whatsappAvailable: z.boolean(),


  consentGiven: z.boolean().refine((value) => value === true, {
    message: "Consent is required.",
  }),

  answers: z.array(answerSchema).default([]),
});

/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
*/
export const sendParticipantOtpSchema = z.object({
  mobile: z.string().trim().regex(
    mobileRegex,
    "Mobile number must contain exactly 10 digits"
  ),
  countryCode: z.string().trim().regex(
    countryCodeRegex,
    "Invalid country code"
  ).default("+91"),
});

export const verifyParticipantOtpSchema = z.object({
  mobile: z.string().trim().regex(
    mobileRegex,
    "Mobile number must contain exactly 10 digits"
  ),
  countryCode: z.string().trim().regex(
    countryCodeRegex,
    "Invalid country code"
  ).default("+91"),
  otp: z.string().trim().regex(
    /^\d{6}$/,
    "OTP must contain exactly 6 digits"
  ),
});

/*
|--------------------------------------------------------------------------
| Super Admin - Questions
|--------------------------------------------------------------------------
*/
export const createQuestionSchema = z
  .object({
    question: z.string().trim().min(5).max(1000),
    type: z.enum(["TEXT", "TEXTAREA", "SELECT", "MULTI_SELECT"]).default("TEXTAREA"),
    options: z.array(z.string().trim().min(1).max(300)).max(50).default([]),
    required: z.boolean().default(true),
    minWords: z.number().int().min(0).default(0),
    maxWords: z.number().int().min(1).default(500),
    displayOrder: z.number().int().min(1).optional(),
  })
  .refine((data) => data.maxWords >= data.minWords, {
    message: "Maximum words must be greater than or equal to minimum words.",
    path: ["maxWords"],
  });

export const updateQuestionSchema = z
  .object({
    question: z.string().trim().min(5).max(1000).optional(),
    type: z.enum(["TEXT", "TEXTAREA", "SELECT", "MULTI_SELECT"]).optional(),
    options: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
    required: z.boolean().optional(),
    minWords: z.number().int().min(0).optional(),
    maxWords: z.number().int().min(1).optional(),
    displayOrder: z.number().int().min(1).optional(),
  })
  .refine(
    (data) =>
      data.minWords === undefined ||
      data.maxWords === undefined ||
      data.maxWords >= data.minWords,
    {
      message: "Maximum words must be greater than or equal to minimum words.",
      path: ["maxWords"],
    }
  );

export const changeQuestionStatusSchema = z.object({
  isActive: z.boolean(),
});

/*
|--------------------------------------------------------------------------
| Super Admin - Volunteer Link
|--------------------------------------------------------------------------
*/


const trackingFields = {
  livelihoodCategories: z.array(z.enum(["AGRICULTURE", "ANIMAL_HUSBANDRY", "MICRO_BUSINESS", "OTHER"])).optional(),
  valueChains: z.array(z.string().trim().min(1).max(100)).optional(),
  supportSolutions: z.array(z.enum([
    "TECHNOLOGY_MACHINERY", "SOLAR_ENERGY", "PRODUCT_DEVELOPMENT", "BRANDING_MARKETING",
    "PACKAGING", "FINANCING", "TRAINING", "MARKET_LINKAGE", "OTHER",
  ])).optional(),
  specificSolutionProviderInterest: z.string().trim().max(500).optional(),
  specificSolutionProviderInterested: z.boolean().optional(),
  nextActions: z.array(z.enum([
    "UNDERSTAND_SOLUTION", "SPEAK_TO_PROVIDER", "GET_COST_ESTIMATE", "EXPLORE_FINANCING",
    "DISCUSS_IMPLEMENTATION", "OTHER",
  ])).optional(),
  usefulAtMela: z.array(z.enum([
    "TECHNOLOGIES_MACHINERY", "SOLAR_ENERGY", "SOLUTION_PROVIDERS", "SPEAKERS_SESSIONS",
    "DEMONSTRATIONS", "FINANCING_SUPPORT", "NETWORKING", "OTHER",
  ])).optional(),
  whatCouldBeBetter: z.string().trim().max(2000).optional(),
  assessmentStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
  implementationStatus: z.enum(["NOT_STARTED", "PLANNED", "APPROVED", "IN_PROGRESS", "IMPLEMENTED", "DEFERRED", "REJECTED"]).optional(),
  recommendedSolutions: z.array(z.string().trim().min(1).max(150)).optional(),
  implementationNotes: z.string().trim().max(3000).optional(),
  matchedVendorIds: z.array(z.string().min(1)).optional(),
  solutionTracks: z.array(z.object({
    solution: z.string().trim().min(1).max(100),
    requirement: z.string().trim().max(300).optional(),
    valueChain: z.string().trim().max(100).optional(),
    providerId: z.string().min(1).nullable().optional(),
    status: z.enum(["IDENTIFIED","RECOMMENDED","MATCHED","PLANNED","IN_PROGRESS","IMPLEMENTED","DEFERRED","REJECTED"]).optional(),
    nextAction: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(2000).optional(),
    updatedAt: z.string().datetime().optional(),
  })).optional(),
};

export const updateParticipantSchema = z.object(trackingFields).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one participant field is required." }
);

export const createVolunteerLinkSchema = z.object({
  volunteerName: z.string().trim().min(2).max(100),
  volunteerMobile: z.string().trim().regex(
    mobileRegex,
    "Volunteer mobile must contain exactly 10 digits"
  ),
});

/*
|--------------------------------------------------------------------------
| Volunteer Registration
| If mobile is supplied, the backend requires an OTP session.
| mobileVerified is deliberately NOT accepted from the client.
|--------------------------------------------------------------------------
*/
export const createVolunteerParticipantSchema = z.object({
  requestId: z.string().trim().min(16).max(100),
  mobileRegistrationType: z.enum([
    "WITH_MOBILE",
    "WITHOUT_MOBILE",
  ]).default("WITH_MOBILE"),

  mobile: z.string().trim().regex(
    mobileRegex,
    "Mobile number must contain exactly 10 digits"
  ).optional().or(z.literal("")).default(""),

  countryCode: z.string().trim().regex(
    countryCodeRegex,
    "Invalid country code"
  ).default("+91"),

  preferredLanguage: z.enum(["en", "hi", "mr", "gu"]).default("mr"),

  name: z.string().trim().min(2).max(100),

  gender: z.enum([
    "MALE",
    "FEMALE",
    "OTHER",
    "PREFER_NOT_TO_SAY",
  ]),

  location: z.string().trim().min(2).max(200),

  organizationType: z.enum([
    "INDIVIDUAL_ENTREPRENEUR",
    "SHG",
    "FPO_FPC",
    "COOPERATIVE",
    "NGO",
    "GOVERNMENT",
    "PRIVATE_COMPANY",
    "OTHER",
  ]),

  organizationName: z.string().trim().min(1).max(200),

  sector: z.enum([
    "FOOD_PROCESSING",
    "AGRICULTURE",
    "LIVESTOCK",
    "RETAIL_SERVICES",
    "MANUFACTURING",
    "OTHER",
  ]),

  whatsappAvailable: z.boolean(),


  consentGiven: z.boolean().refine((value) => value === true, {
    message: "Consent is required.",
  }),

  answers: z.array(answerSchema).default([]),
});

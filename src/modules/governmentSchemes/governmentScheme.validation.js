import { z } from "zod";

const documentSchema = z.object({
  name: z.string().min(1, "Document name is required."),
  url: z.string().url("Document URL must be valid."),
  type: z.string().optional(),
});

const importantLinkSchema = z.object({
  title: z.string().min(1, "Link title is required."),
  url: z.string().url("Link URL must be valid."),
  type: z
    .enum([
      "OFFICIAL",
      "APPLICATION",
      "GUIDELINE",
      "INFORMATION",
      "OTHER",
    ])
    .optional(),
});

const eligibilitySchema = z
  .object({
    genders: z.array(z.string()).optional(),
    minAge: z.number().min(0).nullable().optional(),
    maxAge: z.number().min(0).nullable().optional(),
    occupations: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),

    incomeRange: z
      .object({
        min: z.number().min(0).nullable().optional(),
        max: z.number().min(0).nullable().optional(),
      })
      .optional(),

    categories: z.array(z.string()).optional(),
    beneficiaryTypes: z.array(z.string()).optional(),
    requiredDocuments: z.array(z.string()).optional(),

    otherCriteria: z.string().optional(),
  })
  .optional();

const relatedFieldsSchema = z
  .object({
    occupations: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    participantCategories: z.array(z.string()).optional(),
    eventTypes: z.array(z.string()).optional(),
  })
  .optional();

export const createGovernmentSchemeSchema = z.object({
  schemeName: z.string().min(1, "Scheme name is required."),

  shortDescription: z.string().optional(),

  detailedDescription: z.string().optional(),

  department: z.string().optional(),

  ministry: z.string().optional(),

  schemeType: z.string().optional(),

  category: z.string().optional(),

  status: z
    .enum(["ACTIVE", "INACTIVE", "DRAFT"])
    .optional(),

  officialWebsite: z
    .string()
    .url("Official website must be a valid URL.")
    .optional()
    .or(z.literal("")),

  applicationLink: z
    .string()
    .url("Application link must be a valid URL.")
    .optional()
    .or(z.literal("")),

  helplineNumber: z.string().optional(),

  contactEmail: z
    .string()
    .email("Contact email must be valid.")
    .optional()
    .or(z.literal("")),

  eligibility: eligibilitySchema,

  relatedFields: relatedFieldsSchema,

  documents: z.array(documentSchema).optional(),

  importantLinks: z.array(importantLinkSchema).optional(),
});

export const updateGovernmentSchemeSchema =
  createGovernmentSchemeSchema.partial();
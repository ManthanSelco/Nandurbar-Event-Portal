import Joi from "joi";

const urlSchema = Joi.string()
  .uri()
  .trim();

const documentSchema = Joi.object({
  name: Joi.string().trim().required(),
  url: urlSchema.required(),
  type: Joi.string().trim().default("OTHER"),
});

const importantLinkSchema = Joi.object({
  title: Joi.string().trim().required(),
  url: urlSchema.required(),
});



const relatedFieldsSchema = Joi.object({
  interests: Joi.array().items(Joi.string().trim()).default([]),
  occupations: Joi.array().items(Joi.string().trim()).default([]),
  locations: Joi.array().items(Joi.string().trim()).default([]),
  participantCategories: Joi.array().items(Joi.string().trim()).default([]),
});
export const createVendorSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),

  geography: Joi.string().trim().required(),

  selcoEmpanelled: Joi.boolean().default(false),

  email: Joi.string().email().allow("", null).default(null),

  description: Joi.string().trim().allow("", null).default(null),

  valueChain: Joi.string().trim().allow("", null).default(null),

  secondaryValueChain: Joi.string()
    .trim()
    .allow("", null)
    .default(null),

  relatedFields: relatedFieldsSchema.default({}),

  documents: Joi.array()
    .items(documentSchema)
    .default([]),

  importantLinks: Joi.array()
    .items(importantLinkSchema)
    .default([]),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .default("ACTIVE"),
});

export const updateVendorSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200),

  geography: Joi.string().trim(),

  selcoEmpanelled: Joi.boolean(),

  email: Joi.string().email().allow("", null),

  description: Joi.string().trim().allow("", null),

  valueChain: Joi.string().trim().allow("", null),

  secondaryValueChain: Joi.string()
    .trim()
    .allow("", null),

  relatedFields: relatedFieldsSchema,

  documents: Joi.array()
    .items(documentSchema),

  importantLinks: Joi.array()
    .items(importantLinkSchema),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE"),
}).min(1);
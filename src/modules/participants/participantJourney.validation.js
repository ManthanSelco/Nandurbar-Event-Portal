import { z } from "zod";

/*
|--------------------------------------------------------------------------
| Geolocation Validation
|--------------------------------------------------------------------------
*/

const geolocationSchema = z.object({
  latitude: z.number().min(-90).max(90),

  longitude: z.number().min(-180).max(180),

  capturedAt: z.string().datetime().optional(),
});

/*
|--------------------------------------------------------------------------
| Detailed Assessment Validation
|--------------------------------------------------------------------------
|
| Documents are NOT handled here.
|
| Assessment documents are uploaded through:
|
| POST /participant-journey/:id/assessment/documents
|
| This schema only validates assessment answers, geolocation and status.
|--------------------------------------------------------------------------
*/

export const updateAssessmentSchema = z.object({
  /*
  |--------------------------------------------------------------------------
  | Assessment Questions
  |--------------------------------------------------------------------------
  */

  livelihoodAndProcess: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  difficultActivity: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  productionCapacityAndSeasonality: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  machinesAndManualActivities: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  monthlyFinancials: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  operatingCosts: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  powerSourceAndIssues: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  requiredImprovementOrSolution: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  /*
  |--------------------------------------------------------------------------
  | New Assessment Questions
  |--------------------------------------------------------------------------
  */

  expectedSolution: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  identifiedSolution: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  loansAndSpaceDetails: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  futureScaleAndSupport: z
    .string()
    .trim()
    .max(5000)
    .optional(),

  /*
  |--------------------------------------------------------------------------
  | Geolocation
  |--------------------------------------------------------------------------
  */

  geolocation: geolocationSchema
    .nullable()
    .optional(),

  /*
  |--------------------------------------------------------------------------
  | Assessment Status
  |--------------------------------------------------------------------------
  */

  status: z
    .enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "COMPLETED",
    ])
    .optional(),
});

/*
|--------------------------------------------------------------------------
| Solution & Design
|--------------------------------------------------------------------------
*/

const gapSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(300),

  description: z
    .string()
    .trim()
    .max(2000)
    .optional(),
});

const interventionSchema = z.object({
  interventionType: z.enum([
    "hard",
    "soft",
  ]),

  title: z
    .string()
    .trim()
    .min(1)
    .max(300),

  specification: z
    .string()
    .trim()
    .max(2000)
    .optional(),

  why: z
    .string()
    .trim()
    .max(2000)
    .optional(),

  source: z
    .string()
    .trim()
    .max(500)
    .optional(),

  priority: z
    .enum([
      "High",
      "Medium",
      "Low",
    ])
    .default("Medium"),

  estimatedCost: z
    .number()
    .min(0)
    .nullable()
    .optional(),

  leverageEndUserPercent: z
    .number()
    .min(0)
    .max(100)
    .default(30),

  leverageSelcoPercent: z
    .number()
    .min(0)
    .max(100)
    .default(70),

  teamDecision: z
    .enum([
      "DECIDE",
      "ACCEPT",
      "MODIFY",
      "REJECT",
      "DEFER",
    ])
    .default("DECIDE"),

  decisionRationale: z
    .string()
    .trim()
    .max(3000)
    .optional(),

  addToInterventionPlan: z
    .boolean()
    .default(false),

  status: z
    .enum([
      "Proposed",
      "Approved",
      "Procurement",
      "Installation",
      "Operational",
      "Delayed",
      "Cancelled",
      "Modified",
      "Closed",
    ])
    .default("Proposed"),
});

const indicatorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200),

  baseline: z
    .string()
    .trim()
    .max(200)
    .optional(),

  target: z
    .string()
    .trim()
    .max(200)
    .optional(),

  current: z
    .string()
    .trim()
    .max(200)
    .optional(),

  dateMeasured: z
    .string()
    .datetime()
    .nullable()
    .optional(),
});

export const updateSolutionDesignSchema = z.object({
  gaps: z
    .array(gapSchema)
    .optional(),

  interventions: z
    .array(interventionSchema)
    .optional(),

  indicators: z
    .array(indicatorSchema)
    .optional(),
});

/*
|--------------------------------------------------------------------------
| Implementation Validation
|--------------------------------------------------------------------------
*/

export const updateImplementationSchema = z.object({
  actualCost: z
    .number()
    .min(0)
    .nullable()
    .optional(),

  endUserContribution: z
    .number()
    .min(0)
    .nullable()
    .optional(),

  selcoContribution: z
    .number()
    .min(0)
    .nullable()
    .optional(),

  vendorId: z
    .string()
    .min(1)
    .nullable()
    .optional(),

  vendorName: z
    .string()
    .trim()
    .max(300)
    .optional(),

  procurementDate: z
    .string()
    .datetime()
    .nullable()
    .optional(),

  installationDate: z
    .string()
    .datetime()
    .nullable()
    .optional(),

  operationalDate: z
    .string()
    .datetime()
    .nullable()
    .optional(),

  currentStatus: z
    .enum([
      "Proposed",
      "Approved",
      "Procurement",
      "Installation",
      "Operational",
      "Delayed",
      "Cancelled",
      "Modified",
      "Closed",
    ])
    .optional(),

  gpsSiteConfirmed: z
    .boolean()
    .optional(),

  latitude: z
    .number()
    .min(-90)
    .max(90)
    .nullable()
    .optional(),

  longitude: z
    .number()
    .min(-180)
    .max(180)
    .nullable()
    .optional(),

  reasonForChange: z
    .string()
    .trim()
    .max(3000)
    .optional(),
});
import { Router } from "express";

import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";
import validate from "../../middleware/validate.middleware.js";

import controller from "./participantJourney.controller.js";

import {
  uploadAssessmentDocuments,
  handleAssessmentUploadError,
} from "../../shared/upload/upload.middleware.js";

import {
  updateAssessmentSchema,
  updateSolutionDesignSchema,
  updateImplementationSchema,
  // intervention validation is intentionally handled
  // through the same solution design schema.
} from "./participantJourney.validation.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Participant Journey
|--------------------------------------------------------------------------
| Existing participant routes remain untouched.
|--------------------------------------------------------------------------
*/

router.use(
  protect,
  authorize("SUPER_ADMIN", "STAFF")
);

/*
|--------------------------------------------------------------------------
| Detailed Assessment
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/assessment",
  controller.getAssessment
);

router.patch(
  "/:id/assessment",
  validate(updateAssessmentSchema),
  controller.updateAssessment
);

router.post(
  "/:id/assessment/documents",
  uploadAssessmentDocuments,
  handleAssessmentUploadError,
  controller.uploadAssessmentDocuments
);


router.delete(
  "/:id/assessment/documents",
  controller.deleteAssessmentDocument
);

/*
|--------------------------------------------------------------------------
| Solution & Design
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/solution-design",
  controller.getSolutionDesign
);

router.patch(
  "/:id/solution-design",
  validate(updateSolutionDesignSchema),
  controller.updateSolutionDesign
);

router.post(
  "/:id/solution-design/interventions",
  validate(updateSolutionDesignSchema.pick({ interventions: true })),
  async (req, res, next) => {
    try {
      const intervention = req.body.interventions?.[0];

      if (!intervention) {
        return res.status(400).json({
          success: false,
          message: "Intervention is required.",
        });
      }

      req.body = intervention;
      return controller.addIntervention(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/solution-design/interventions/:interventionId",
  validate(updateSolutionDesignSchema.pick({ interventions: true })),
  async (req, res, next) => {
    try {
      const intervention = req.body.interventions?.[0];

      if (!intervention) {
        return res.status(400).json({
          success: false,
          message: "Intervention is required.",
        });
      }

      req.body = intervention;
      return controller.updateIntervention(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/*
|--------------------------------------------------------------------------
| Implementation
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/implementation",
  controller.getImplementation
);

router.post(
  "/:id/implementation/:interventionId",
  controller.createImplementation
);

router.patch(
  "/:id/implementation/:implementationId",
  validate(updateImplementationSchema),
  controller.updateImplementation
);

export default router;
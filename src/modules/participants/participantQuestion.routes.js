import { Router } from "express";

import questionController from "./participantQuestion.controller.js";
import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";
import validate from "../../middleware/validate.middleware.js";

import {
  createQuestionSchema,
  updateQuestionSchema,
  changeQuestionStatusSchema,
} from "./participant.validation.js";

const router = Router();

// Public endpoint used by the participant registration form.
router.get("/registration", questionController.getRegistrationQuestions);

router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  validate(createQuestionSchema),
  questionController.createQuestion
);

router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN"),
  questionController.getAllQuestions
);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  questionController.getQuestionById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  validate(updateQuestionSchema),
  questionController.updateQuestion
);

router.patch(
  "/:id/status",
  protect,
  authorize("SUPER_ADMIN"),
  validate(changeQuestionStatusSchema),
  questionController.changeStatus
);

router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  questionController.deleteQuestion
);

export default router;

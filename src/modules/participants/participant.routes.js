import { Router } from "express";

import participantController from "./participant.controller.js";
import volunteerRegistrationController from "./volunteerRegistration.controller.js";

import validate from "../../middleware/validate.middleware.js";
import protect from "../auth/auth.middleware.js";
import authorize from "../../middleware/authorize.middleware.js";

import {
  createParticipantSchema,
  sendParticipantOtpSchema,
  verifyParticipantOtpSchema,
  createVolunteerParticipantSchema,
  updateParticipantSchema,
  createVolunteerLinkSchema,
} from "./participant.validation.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| Admin participant management
|--------------------------------------------------------------------------
*/
router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  participantController.getParticipants
);

router.get("/stats", protect, authorize("SUPER_ADMIN", "STAFF"), participantController.getStats);

router.get(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  participantController.getParticipantById
);

router.patch(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "STAFF"),
  validate(updateParticipantSchema),
  participantController.updateParticipant
);

router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN"),
  participantController.deleteParticipant
);

/*
|--------------------------------------------------------------------------
| Public QR registration
|--------------------------------------------------------------------------
*/

router.post(
  "/registration/send-otp",
  validate(sendParticipantOtpSchema),
  participantController.sendOtp
);

router.post(
  "/registration/verify-otp",
  validate(verifyParticipantOtpSchema),
  participantController.verifyOtp
);

router.post(
  "/registration",
  validate(createParticipantSchema),
  participantController.createParticipant
);



/*
|--------------------------------------------------------------------------
| Super Admin - create temporary volunteer link
|--------------------------------------------------------------------------
*/

router.post(
  "/volunteer/link",
  protect,
  authorize("SUPER_ADMIN"),
  validate(createVolunteerLinkSchema),
  volunteerRegistrationController.createVolunteerLink
);

/*
|--------------------------------------------------------------------------
| Volunteer - register participant
|--------------------------------------------------------------------------
*/

router.post(
  "/volunteer/registration",
  validate(createVolunteerParticipantSchema),
  participantController.createVolunteerParticipant
);

export default router;

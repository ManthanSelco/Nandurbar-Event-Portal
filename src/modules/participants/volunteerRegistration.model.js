import mongoose from "mongoose";

const volunteerRegistrationSchema =
  new mongoose.Schema(
    {
      token: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      volunteerName: {
        type: String,
        required: true,
        trim: true,
      },

      volunteerMobile: {
        type: String,
        required: true,
        trim: true,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        required: true,
      },

      maxRegistrations: { type: Number, default: 10, min: 1, max: 100 },
      registrationCount: { type: Number, default: 0, min: 0 },

      expiresAt: {
        type: Date,
        required: true,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

volunteerRegistrationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "VolunteerRegistration",
  volunteerRegistrationSchema
);
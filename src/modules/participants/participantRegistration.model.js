import mongoose from "mongoose";

const participantRegistrationSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    countryCode: {
      type: String,
      default: "+91",
    },

    mobileVerified: {
      type: Boolean,
      default: false,
    },

    sessionToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

participantRegistrationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "ParticipantRegistration",
  participantRegistrationSchema
);
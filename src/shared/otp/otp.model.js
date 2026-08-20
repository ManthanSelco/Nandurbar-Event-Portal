import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      index: true,
    },

    countryCode: {
      type: String,
      default: "+91",
    },

    otpHash: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: [
        "PARTICIPANT_REGISTRATION",
        "STAFF_EMAIL_VERIFICATION",
        "FORGOT_PASSWORD",
      ],
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    verified: {
      type: Boolean,
      default: false,
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

// Automatically remove expired OTP records
otpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
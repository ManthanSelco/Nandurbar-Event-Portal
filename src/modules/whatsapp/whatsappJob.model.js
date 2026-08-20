import mongoose from "mongoose";

const whatsappJobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["WELCOME_TEMPLATE"],
      required: true,
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "PROCESSING", "SENT", "FAILED"],
      default: "QUEUED",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    providerMessageId: { type: String, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

// One welcome message job per participant.
whatsappJobSchema.index(
  { type: 1, participant: 1 },
  { unique: true }
);

export default mongoose.model("WhatsAppJob", whatsappJobSchema);

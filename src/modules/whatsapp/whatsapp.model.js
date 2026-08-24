import mongoose from "mongoose";

const whatsappInteractionSchema = new mongoose.Schema(
  {
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Participant",
      default: null,
      index: true,
    },

    mobile: {
      type: String,
      trim: true,
      default: null,
    },

    direction: {
      type: String,
      enum: ["INBOUND", "OUTBOUND"],
      required: true,
    },

    method: {
      type: String,
      enum: ["BOT", "ADMIN", "SYSTEM", "WEBHOOK"],
      required: true,
    },

    messageType: {
      type: String,
      enum: [
        "TEXT",
        "TEMPLATE",
        "REQUIREMENT_QUESTION",
        "REQUIREMENT_SELECTION",
        "VENDOR_DETAILS",
        "GOVERNMENT_SCHEME_DETAILS",
        "STATUS_UPDATE",
      ],
      required: true,
    },

    queryType: {
  type: String,
  enum: [
    "SUPPORT_REQUEST",
    "REQUIREMENT_SELECTION",
    "INFORMATION_REQUEST",
    "FOLLOW_UP",
    "POST_EVENT",
    "OTHER",
  ],
  default: "OTHER",
},

    message: {
      type: String,
      trim: true,
      default: "",
    },

    selectedRequirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportRequirement",
      default: null,
    },

    matchedVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
    ],

    matchedGovernmentSchemes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GovernmentScheme",
      },
    ],

    providerMessageId: {
      type: String,
      default: null,
      index: true,
    },

    // Optional Gupshup/provider correlation key.
    // It remains undefined until a real external message key is available.
    externalMessageKey: {
      type: String,
      default: undefined,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "SENT",
        "DELIVERED",
        "READ",
        "RECEIVED",
        "FAILED",
      ],
      default: "PENDING",
      index: true,
    },

    errorMessage: {
      type: String,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Participant conversation history
 */
whatsappInteractionSchema.index({
  participant: 1,
  createdAt: -1,
});

/*
 * Gupshup external message key.
 *
 * Unique only when a real value exists.
 * Multiple documents without an externalMessageKey are allowed.
 */
whatsappInteractionSchema.index(
  { externalMessageKey: 1 },
  {
    unique: true,
    sparse: true,
  }
);

const WhatsAppInteraction = mongoose.model(
  "WhatsAppInteraction",
  whatsappInteractionSchema
);

export default WhatsAppInteraction;
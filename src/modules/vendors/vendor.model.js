import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      default: "OTHER",
    },
  },
  { _id: true }
);

const importantLinkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    geography: {
      type: String,
      required: true,
      trim: true,
    },

    selcoEmpanelled: {
      type: Boolean,
      default: false,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    valueChain: {
      type: String,
      trim: true,
      default: null,
    },

    secondaryValueChain: {
      type: String,
      trim: true,
      default: null,
    },

    relatedFields: {
      interests: {
        type: [String],
        default: [],
      },
      occupations: {
        type: [String],
        default: [],
      },
      locations: {
        type: [String],
        default: [],
      },
      participantCategories: {
        type: [String],
        default: [],
      },
    },

    documents: {
      type: [documentSchema],
      default: [],
    },

    importantLinks: {
      type: [importantLinkSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

vendorSchema.index({ name: 1 });
vendorSchema.index({ geography: 1 });
vendorSchema.index({ selcoEmpanelled: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ "relatedFields.interests": 1 });

const Vendor = mongoose.model("Vendor", vendorSchema);

export default Vendor;
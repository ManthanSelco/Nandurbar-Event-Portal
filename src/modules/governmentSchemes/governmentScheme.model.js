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
  { _id: false }
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

    type: {
      type: String,
      enum: [
        "OFFICIAL",
        "APPLICATION",
        "GUIDELINE",
        "INFORMATION",
        "OTHER",
      ],
      default: "OTHER",
    },
  },
  { _id: false }
);

const eligibilitySchema = new mongoose.Schema(
  {
    genders: {
      type: [String],
      default: [],
    },

    minAge: {
      type: Number,
      min: 0,
      default: null,
    },

    maxAge: {
      type: Number,
      min: 0,
      default: null,
    },

    occupations: {
      type: [String],
      default: [],
    },

    locations: {
      type: [String],
      default: [],
    },

    incomeRange: {
      min: {
        type: Number,
        min: 0,
        default: null,
      },

      max: {
        type: Number,
        min: 0,
        default: null,
      },
    },

    categories: {
      type: [String],
      default: [],
    },

    beneficiaryTypes: {
      type: [String],
      default: [],
    },

    requiredDocuments: {
      type: [String],
      default: [],
    },

    otherCriteria: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const relatedFieldsSchema = new mongoose.Schema(
  {
    occupations: {
      type: [String],
      default: [],
    },

    interests: {
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

    eventTypes: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const governmentSchemeSchema = new mongoose.Schema(
  {
    schemeName: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },

    detailedDescription: {
      type: String,
      trim: true,
      default: "",
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    ministry: {
      type: String,
      trim: true,
      default: "",
    },

    schemeType: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "DRAFT"],
      default: "ACTIVE",
    },

    officialWebsite: {
      type: String,
      trim: true,
      default: "",
    },

    applicationLink: {
      type: String,
      trim: true,
      default: "",
    },

    helplineNumber: {
      type: String,
      trim: true,
      default: "",
    },

    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    eligibility: {
      type: eligibilitySchema,
      default: () => ({}),
    },

    relatedFields: {
      type: relatedFieldsSchema,
      default: () => ({}),
    },

    documents: {
      type: [documentSchema],
      default: [],
    },

    importantLinks: {
      type: [importantLinkSchema],
      default: [],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

governmentSchemeSchema.index({
  schemeName: "text",
  shortDescription: "text",
});

governmentSchemeSchema.index({
  status: 1,
  isDeleted: 1,
});

governmentSchemeSchema.index({
  "relatedFields.occupations": 1,
  "relatedFields.locations": 1,
});

const GovernmentScheme = mongoose.model(
  "GovernmentScheme",
  governmentSchemeSchema
);

export default GovernmentScheme;
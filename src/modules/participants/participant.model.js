import mongoose from "mongoose";

const participantAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParticipantQuestion",
      required: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Detailed Assessment Document Schema
|--------------------------------------------------------------------------
| These documents belong to the Detailed Assessment tab.
| Multiple photos are supported for:
| - Site photos
| - Machinery photos
| - Product photos
|--------------------------------------------------------------------------
*/
const assessmentDocumentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      trim: true,
      required: true,
    },

    /*
     * Permanent S3 object key.
     *
     * Example:
     * participants/12345/assessment/sitePhotos/123456-photo.jpg
     */
    fileKey: {
      type: String,
      trim: true,
      required: true,
    },

    /*
     * Temporary signed URL.
     *
     * This is NOT the permanent storage reference.
     * Backend can refresh this URL whenever the participant is fetched.
     */
    fileUrl: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * MIME type of uploaded file.
     *
     * Example:
     * image/jpeg
     * image/png
     * application/pdf
     */
    fileType: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * File size in bytes.
     */
    fileSize: {
      type: Number,
      default: 0,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/*
|--------------------------------------------------------------------------
| Detailed Assessment Geolocation Schema
|--------------------------------------------------------------------------
*/
const assessmentGeolocationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    capturedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    registrationRequestId: { type: String, default: null, trim: true },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    mobile: {
      type: String,
      default: null,
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

    mobileVerificationMethod: {
      type: String,
      enum: ["OTP", "NONE", "NOT_PROVIDED"],
      default: "NONE",
    },

    preferredLanguage: {
      type: String,
      enum: ["en", "hi", "mr", "gu"],
      default: "mr",
      index: true,
    },

    participantStatus: {
      type: String,
      enum: [
        "REGISTERED",
        "QUERY_RAISED",
        "IN_PROGRESS",
        "PROBLEM_SOLVED",
        "WHATSAPP_CONTACTED",
        "REQUIREMENT_SELECTED",
        "VENDOR_SHARED",
        "GOVERNMENT_SCHEME_SHARED",
      ],
      default: "REGISTERED",
      index: true,
    },

    whatsappStatus: {
      type: String,
      enum: ["NOT_AVAILABLE", "PENDING", "CONTACTED", "ACTIVE", "FAILED"],
      default: "PENDING",
      index: true,
    },

    lastWhatsAppInteractionAt: {
      type: Date,
      default: null,
    },

    postEventStep: {
      type: String,
      enum: [
        "NONE",
        "LIVELIHOOD",
        "SUPPORT",
        "SPECIFIC_SOLUTION",
        "NEXT_ACTION",
        "USEFUL",
        "FEEDBACK",
        "COMPLETED",
      ],
      default: "NONE",
      index: true,
    },

    followUpRequired: {
      type: Boolean,
      default: false,
    },

    selectedRequirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupportRequirement",
      default: null,
    },

    // Post-event requirement and implementation tracking.
    livelihoodCategories: {
      type: [String],
      enum: [
        "AGRICULTURE",
        "ANIMAL_HUSBANDRY",
        "MICRO_BUSINESS",
        "OTHER",
      ],
      default: [],
      index: true,
    },

    valueChains: {
      type: [String],
      default: [],
      index: true,
    },

    supportSolutions: {
      type: [String],
      enum: [
        "TECHNOLOGY_MACHINERY",
        "SOLAR_ENERGY",
        "PRODUCT_DEVELOPMENT",
        "BRANDING_MARKETING",
        "PACKAGING",
        "FINANCING",
        "TRAINING",
        "MARKET_LINKAGE",
        "OTHER",
      ],
      default: [],
      index: true,
    },

    specificSolutionProviderInterest: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    specificSolutionProviderInterested: {
      type: Boolean,
      default: false,
    },

    nextActions: {
      type: [String],
      enum: [
        "UNDERSTAND_SOLUTION",
        "SPEAK_TO_PROVIDER",
        "GET_COST_ESTIMATE",
        "EXPLORE_FINANCING",
        "DISCUSS_IMPLEMENTATION",
        "OTHER",
      ],
      default: [],
    },

    usefulAtMela: {
      type: [String],
      enum: [
        "TECHNOLOGIES_MACHINERY",
        "SOLAR_ENERGY",
        "SOLUTION_PROVIDERS",
        "SPEAKERS_SESSIONS",
        "DEMONSTRATIONS",
        "FINANCING_SUPPORT",
        "NETWORKING",
        "OTHER",
      ],
      default: [],
    },

    whatCouldBeBetter: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Existing Assessment Status
    |--------------------------------------------------------------------------
    | KEEPING THIS EXACTLY AS IT EXISTS.
    | This status will be used by the new Detailed Assessment tab.
    |--------------------------------------------------------------------------
    */
    assessmentStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      default: "NOT_STARTED",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Detailed Participant Assessment
    |--------------------------------------------------------------------------
    | IMPORTANT:
    | This is separate from the existing `answers` field.
    |
    | Existing `answers`:
    |     Registration questionnaire
    |
    | `detailedAssessment`:
    |     Detailed participant assessment
    |--------------------------------------------------------------------------
    */
    detailedAssessment: {
      /*
      |----------------------------------------------------------------------
      | Question 1
      | Main livelihood and complete process from raw material to final
      | product.
      |----------------------------------------------------------------------
      */
      livelihoodAndProcess: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 2
      | Most difficult / time-consuming / labour-intensive / highest-loss
      | activity.
      |----------------------------------------------------------------------
      */
      difficultActivity: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 3
      | Production capacity, working time and seasonal variation.
      |----------------------------------------------------------------------
      */
      productionCapacityAndSeasonality: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 4
      | Machines/tools currently used and manual activities.
      |----------------------------------------------------------------------
      */
      machinesAndManualActivities: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 5
      | Monthly sales, expenses and approximate net profit.
      |----------------------------------------------------------------------
      */
      monthlyFinancials: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 6
      | Major operating costs.
      |----------------------------------------------------------------------
      */
      operatingCosts: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 7
      | Power source, electricity/fuel spending and impact of power issues.
      |----------------------------------------------------------------------
      */
      powerSourceAndIssues: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 8
      | Most important improvement / solution required.
      |----------------------------------------------------------------------
      */
      requiredImprovementOrSolution: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 9
      | Existing loans / EMI and own or rental enterprise space.
      |----------------------------------------------------------------------
      */
      loansAndSpaceDetails: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      /*
      |----------------------------------------------------------------------
      | Question 10
      | Expected future scale and required support / technology.
      |----------------------------------------------------------------------
      */
      futureScaleAndSupport: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },


      expectedSolution: {
  type: String,
  trim: true,
  maxlength: 5000,
  default: "",
},

identifiedSolution: {
  type: String,
  trim: true,
  maxlength: 5000,
  default: "",
},
      /*
      |--------------------------------------------------------------------------
      | Mandatory / Supporting Documents
      |--------------------------------------------------------------------------
      |
      | Multiple:
      | - Site photos
      | - Machinery photos
      | - Product photos
      |
      | Single:
      | - Electricity bill
      |--------------------------------------------------------------------------
      */
      documents: {
        sitePhotos: {
          type: [assessmentDocumentSchema],
          default: [],
        },

        machineryPhotos: {
          type: [assessmentDocumentSchema],
          default: [],
        },

        productPhotos: {
          type: [assessmentDocumentSchema],
          default: [],
        },

        otherDocuments: {
    type: [assessmentDocumentSchema],
    default: [],
  },

        electricityBill: {
          type: assessmentDocumentSchema,
          default: null,
        },
      },

      /*
      |--------------------------------------------------------------------------
      | Geolocation
      |--------------------------------------------------------------------------
      */
      geolocation: {
        type: assessmentGeolocationSchema,
        default: null,
      },

      /*
      |--------------------------------------------------------------------------
      | Last assessment update
      |--------------------------------------------------------------------------
      */
      lastUpdatedAt: {
        type: Date,
        default: null,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Existing Implementation Status
    |--------------------------------------------------------------------------
    | KEEPING EXISTING FIELD UNCHANGED FOR NOW.
    |--------------------------------------------------------------------------
    */
    implementationStatus: {
      type: String,
      enum: [
        "NOT_STARTED",
        "PLANNED",
        "APPROVED",
        "IN_PROGRESS",
        "IMPLEMENTED",
        "DEFERRED",
        "REJECTED",
      ],
      default: "NOT_STARTED",
      index: true,
    },

    recommendedSolutions: {
      type: [String],
      default: [],
    },

    implementationNotes: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },

    matchedVendorIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },
    ],

    solutionTracks: {
      type: [
        {
          solution: {
            type: String,
            required: true,
            trim: true,
          },

          requirement: {
            type: String,
            trim: true,
            default: "",
          },

          valueChain: {
            type: String,
            trim: true,
            default: "",
          },

          providerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            default: null,
          },

          status: {
            type: String,
            enum: [
              "IDENTIFIED",
              "RECOMMENDED",
              "MATCHED",
              "PLANNED",
              "IN_PROGRESS",
              "IMPLEMENTED",
              "DEFERRED",
              "REJECTED",
            ],
            default: "IDENTIFIED",
          },

          nextAction: {
            type: String,
            trim: true,
            default: "",
          },

          notes: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: "",
          },

          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
      required: true,
    },

    // Legacy field retained for backward compatibility with older participant records.
    age: {
      type: Number,
      required: false,
      min: 1,
      max: 120,
      default: null,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    organizationType: {
      type: String,
      enum: [
        "INDIVIDUAL_ENTREPRENEUR",
        "SHG",
        "FPO_FPC",
        "COOPERATIVE",
        "NGO",
        "GOVERNMENT",
        "PRIVATE_COMPANY",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    organizationName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    sector: {
      type: String,
      enum: [
        "FOOD_PROCESSING",
        "AGRICULTURE",
        "LIVESTOCK",
        "RETAIL_SERVICES",
        "MANUFACTURING",
        "Papad",
        "Mushroom",
        "Millets",
        "Chilli",
        "Oil Mill",
        "Rice Mill",
        "Dairy",
        "Honey",
        "Dal",
        "Vegitable",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    // Legacy field retained for backward compatibility with older participant records.
    occupation: {
      type: String,
      required: false,
      trim: true,
      maxlength: 150,
      default: null,
    },

    whatsappAvailable: {
      type: Boolean,
      required: true,
    },

    registrationMethod: {
      type: String,
      enum: ["SELF_QR", "VOLUNTEER", "PAPER"],
      required: true,
    },

    // Legacy fields retained for older participant records. New profile data is captured
    // through organizationType, organizationName and sector.
    purposeOfVisit: {
      type: String,
      required: false,
      trim: true,
      maxlength: 300,
      default: null,
    },

    interestCategory: {
      type: String,
      required: false,
      trim: true,
      maxlength: 150,
      default: null,
    },

    consentGiven: {
      type: Boolean,
      required: true,
    },

    answers: {
      type: [participantAnswerSchema],
      default: [],
    },

    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    volunteerName: {
      type: String,
      default: null,
      trim: true,
    },

    volunteerMobile: {
      type: String,
      default: null,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

participantSchema.index(
  { mobile: 1 },
  {
    unique: true,
    partialFilterExpression: {
      mobile: { $type: "string" },
      isDeleted: false,
    },
  }
);

participantSchema.index(
  { registrationRequestId: 1 },
  { unique: true, sparse: true }
);

participantSchema.index({ interestCategory: 1 });
participantSchema.index({ selectedRequirement: 1 });
participantSchema.index({ livelihoodCategories: 1 });
participantSchema.index({ supportSolutions: 1 });

export default mongoose.model("Participant", participantSchema);
import mongoose from "mongoose";
import { STAFF_ROLE } from "./staff.constants.js";

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

  email: {
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    trim:true,
    match:[
      /^[a-zA-Z0-9._%+-]+@selcofoundation\.org$/,
      "Only SELCO Foundation email allowed"
    ]
},

emailVerified: {
  type: Boolean,
  default: false,
},

emailVerifiedAt: {
  type: Date,
  default: null,
},

    countryCode: {
      type: String,
      default: "+91",
    },

    mobile: {
    type:String,
    required:true,
    trim:true,
    unique:true
},

    password: {
      type: String,
      required: true,
      select: false,
    },

  role: {
  type: String,
  enum: Object.values(STAFF_ROLE),
  default: STAFF_ROLE.STAFF,
},

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
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

export default mongoose.model("Staff", staffSchema);
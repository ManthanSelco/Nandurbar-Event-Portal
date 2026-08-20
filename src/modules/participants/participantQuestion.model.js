import mongoose from "mongoose";

const participantQuestionSchema =
  new mongoose.Schema(
    {
      question: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      type: {
        type: String,
        enum: [
          "TEXT",
          "TEXTAREA",
          "SELECT",
          "MULTI_SELECT",
        ],
        default: "TEXTAREA",
      },

      options: {
        type: [String],
        default: [],
      },

      required: {
        type: Boolean,
        default: true,
      },

      minWords: {
        type: Number,
        default: 0,
        min: 0,
      },

      maxWords: {
        type: Number,
        default: 500,
        min: 1,
      },

      displayOrder: {
        type: Number,
        required: true,
        min: 1,
      },

      isActive: {
        type: Boolean,
        default: true,
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
    },
    {
      timestamps: true,
    }
  );

participantQuestionSchema.index({
  isActive: 1,
  displayOrder: 1,
});

export default mongoose.model(
  "ParticipantQuestion",
  participantQuestionSchema
);
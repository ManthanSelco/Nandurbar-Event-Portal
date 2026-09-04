
import mongoose from "mongoose";
import Participant from "./participant.model.js";
import ApiError from "../../shared/errors/ApiError.js";
import {
  uploadToS3,
  getS3SignedUrl,
  deleteFromS3,
} from "../../shared/upload/s3.service.js";

const getParticipant = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid participant ID.");
  }

  const participant = await Participant.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!participant) {
    throw new ApiError(404, "Participant not found.");
  }

  return participant;
};

/*
|--------------------------------------------------------------------------
| Detailed Assessment
|--------------------------------------------------------------------------
*/

const getAssessment = async (id) => {
  const participant = await getParticipant(id);

  const assessment = participant.detailedAssessment?.toObject
    ? participant.detailedAssessment.toObject()
    : participant.detailedAssessment || {};

  if (assessment.documents) {
    const documentTypes = [
      "sitePhotos",
      "machineryPhotos",
      "productPhotos",
      "otherDocuments",
      "electricityBill",
    ];

    for (const docType of documentTypes) {
      let documents = assessment.documents[docType];

      // Backward compatibility:
      // Old electricity bill was stored as a single object.
      if (docType === "electricityBill" && documents) {
        if (!Array.isArray(documents)) {
          documents = [documents];
        }
      }

      if (!Array.isArray(documents)) {
        assessment.documents[docType] = [];
        continue;
      }

      assessment.documents[docType] = await Promise.all(
        documents.map(async (document) => {
          if (!document?.fileKey) {
            return document;
          }

          return {
            ...document,
            fileUrl: await getS3SignedUrl(document.fileKey),
          };
        })
      );
    }
  }

  return {
    participantId: participant._id,
    status: participant.assessmentStatus,
    assessment,
  };
};

const updateAssessment = async (id, payload) => {
  const participant = await getParticipant(id);

  const current = participant.detailedAssessment?.toObject
    ? participant.detailedAssessment.toObject()
    : participant.detailedAssessment || {};

  // Status belongs to participant.assessmentStatus,
  // not inside detailedAssessment.
  const { status, ...assessmentPayload } = payload;

  const next = {
    ...current,
    ...assessmentPayload,
    lastUpdatedAt: new Date(),
  };

  participant.detailedAssessment = next;

  /*
  |--------------------------------------------------------------------------
  | Assessment status
  |--------------------------------------------------------------------------
  */

  if (status) {
    participant.assessmentStatus = status;
  } else if (participant.assessmentStatus === "NOT_STARTED") {
    participant.assessmentStatus = "IN_PROGRESS";
  }

  await participant.save();

  return {
    participantId: participant._id,
    status: participant.assessmentStatus,
    assessment: participant.detailedAssessment,
  };
};

const uploadAssessmentDocuments = async (id, docType, files) => {
  const participant = await getParticipant(id);

  const allowedDocTypes = [
    "sitePhotos",
    "machineryPhotos",
    "productPhotos",
    "electricityBill",
    "otherDocuments",
  ];

  if (!allowedDocTypes.includes(docType)) {
    throw new ApiError(400, "Invalid document type.");
  }

  if (!files || files.length === 0) {
    throw new ApiError(400, "At least one file is required.");
  }

  if (!participant.detailedAssessment) {
    participant.detailedAssessment = {};
  }

  if (!participant.detailedAssessment.documents) {
    participant.detailedAssessment.documents = {
      sitePhotos: [],
      machineryPhotos: [],
      productPhotos: [],
      electricityBill: [],
      otherDocuments: [],
    };
  }

  const currentDocuments =
    participant.detailedAssessment.documents[docType];

  // Backward compatibility:
  // Old electricity bill may exist as a single object.
  const existingDocuments = Array.isArray(currentDocuments)
    ? currentDocuments
    : currentDocuments
      ? [currentDocuments]
      : [];

  const uploadedDocuments = [];

  for (const file of files) {
    const fileKey = await uploadToS3({
      buffer: file.buffer,
      fileName: file.originalname,
      contentType: file.mimetype,
      participantId: participant._id.toString(),
      docType,
    });

    const document = {
      fileName: file.originalname,
      fileKey,
      fileUrl: await getS3SignedUrl(fileKey),
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date(),
    };

    uploadedDocuments.push(document);
  }

  // IMPORTANT:
  // Assign a completely new array instead of using push().
  participant.detailedAssessment.documents[docType] = [
    ...existingDocuments,
    ...uploadedDocuments,
  ];

  participant.detailedAssessment.lastUpdatedAt = new Date();

  if (participant.assessmentStatus === "NOT_STARTED") {
    participant.assessmentStatus = "IN_PROGRESS";
  }

  await participant.save();

  return {
    participantId: participant._id,
    docType,
    documents: uploadedDocuments,
    assessmentStatus: participant.assessmentStatus,
  };
};

const deleteAssessmentDocument = async (
  id,
  docType,
  fileKey
) => {
  const participant = await getParticipant(id);

  const documents =
    participant.detailedAssessment?.documents;

  if (!documents) {
    throw new ApiError(
      404,
      "Assessment documents not found."
    );
  }

  const allowedDocTypes = [
    "sitePhotos",
    "otherDocuments",
    "machineryPhotos",
    "productPhotos",
    "electricityBill",
  ];

  if (!allowedDocTypes.includes(docType)) {
    throw new ApiError(
      400,
      "Invalid document type."
    );
  }

  let documentList = documents[docType] || [];

  // Backward compatibility for old electricity bill object
  if (!Array.isArray(documentList)) {
    documentList = documentList
      ? [documentList]
      : [];
  }

  const documentIndex = documentList.findIndex(
    (document) =>
      document.fileKey === fileKey
  );

  if (documentIndex === -1) {
    throw new ApiError(
      404,
      "Document not found."
    );
  }

  const document =
    documentList[documentIndex];

  await deleteFromS3(document.fileKey);

  documentList.splice(documentIndex, 1);

  documents[docType] = documentList;

  participant.detailedAssessment.lastUpdatedAt =
    new Date();

  await participant.save();

  return {
    participantId: participant._id,
    docType,
    fileKey,
    assessmentStatus:
      participant.assessmentStatus,
    documents:
      participant.detailedAssessment.documents,
  };
};

/*
|--------------------------------------------------------------------------
| Solution & Design
|--------------------------------------------------------------------------
*/

const getSolutionDesign = async (id) => {
  const participant = await getParticipant(id);

  return {
    participantId: participant._id,
    solutionDesign: participant.solutionDesign || {
      gaps: [],
      interventions: [],
      indicators: [],
    },
  };
};

const updateSolutionDesign = async (id, payload) => {
  const participant = await getParticipant(id);

  const current = participant.solutionDesign?.toObject
    ? participant.solutionDesign.toObject()
    : participant.solutionDesign || {};

  participant.solutionDesign = {
    ...current,
    ...payload,
    lastUpdatedAt: new Date(),
  };

  await participant.save();

  return participant.solutionDesign;
};

/*
|--------------------------------------------------------------------------
| Add Solution Intervention
|--------------------------------------------------------------------------
*/

const addIntervention = async (id, payload) => {
  const participant = await getParticipant(id);

  if (!participant.solutionDesign) {
    participant.solutionDesign = {
      gaps: [],
      interventions: [],
      indicators: [],
    };
  }

  participant.solutionDesign.interventions.push(payload);
  participant.solutionDesign.lastUpdatedAt = new Date();

  await participant.save();

  return participant.solutionDesign.interventions[
    participant.solutionDesign.interventions.length - 1
  ];
};

/*
|--------------------------------------------------------------------------
| Update Solution Intervention
|--------------------------------------------------------------------------
*/

const updateIntervention = async (
  id,
  interventionId,
  payload
) => {
  const participant = await getParticipant(id);

  const intervention =
    participant.solutionDesign?.interventions?.id(
      interventionId
    );

  if (!intervention) {
    throw new ApiError(
      404,
      "Solution intervention not found."
    );
  }

  Object.assign(intervention, payload);

  participant.solutionDesign.lastUpdatedAt =
    new Date();

  await participant.save();

  return intervention;
};

/*
|--------------------------------------------------------------------------
| Implementation
|--------------------------------------------------------------------------
*/

const getImplementation = async (id) => {
  const participant = await getParticipant(id);

  return {
    participantId: participant._id,
    implementation: participant.implementation || {
      interventions: [],
    },
  };
};

const createImplementation = async (
  id,
  plannedInterventionId
) => {
  const participant = await getParticipant(id);

  if (
    !participant.solutionDesign ||
    !participant.solutionDesign.interventions
  ) {
    throw new ApiError(
      400,
      "No Solution & Design intervention exists for this participant."
    );
  }

  const planned =
    participant.solutionDesign.interventions.id(
      plannedInterventionId
    );

  if (!planned) {
    throw new ApiError(
      404,
      "Planned intervention not found."
    );
  }

  if (!participant.implementation) {
    participant.implementation = {
      interventions: [],
    };
  }

  const existing =
    participant.implementation.interventions.find(
      (item) =>
        String(item.plannedInterventionId) ===
        String(plannedInterventionId)
    );

  if (existing) {
    return existing;
  }

  participant.implementation.interventions.push({
    plannedInterventionId: planned._id,
    currentStatus: "Proposed",
    lastUpdatedAt: new Date(),
  });

  participant.implementation.lastUpdatedAt =
    new Date();

  /*
  |--------------------------------------------------------------------------
  | Important
  |--------------------------------------------------------------------------
  | Individual implementation currentStatus does not
  | automatically change participant-level implementationStatus.
  |--------------------------------------------------------------------------
  */

  await participant.save();

  return participant.implementation.interventions[
    participant.implementation.interventions.length - 1
  ];
};

const updateImplementation = async (
  id,
  implementationId,
  payload
) => {
  const participant = await getParticipant(id);

  const implementation =
    participant.implementation?.interventions?.id(
      implementationId
    );

  if (!implementation) {
    throw new ApiError(
      404,
      "Implementation record not found."
    );
  }

  Object.assign(implementation, payload);

  implementation.lastUpdatedAt = new Date();

  participant.implementation.lastUpdatedAt =
    new Date();

  /*
  |--------------------------------------------------------------------------
  | Important
  |--------------------------------------------------------------------------
  | Do NOT map implementation.currentStatus to
  | participant.implementationStatus.
  |
  | currentStatus = individual intervention status
  | implementationStatus = participant-level journey status
  |--------------------------------------------------------------------------
  */

  await participant.save();

  return implementation;
};

export default {
  getAssessment,
  updateAssessment,
  uploadAssessmentDocuments,

  getSolutionDesign,
  updateSolutionDesign,
  addIntervention,
  updateIntervention,
  deleteAssessmentDocument,

  getImplementation,
  createImplementation,
  updateImplementation,
};


import XLSX from "xlsx";
import Vendor from "./vendor.model.js";
import { createVendorSchema } from "./vendor.validation.js";
import ApiError from "../../shared/errors/ApiError.js";

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "1", "y"].includes(
    String(value ?? "").trim().toLowerCase()
  );
};

const parseArray = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const importCsv = async (buffer, staffId) => {
  if (!buffer?.length) {
    throw new ApiError(400, "CSV file is required.");
  }

  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new ApiError(400, "CSV contains no worksheet.");
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new ApiError(400, "CSV contains no data rows.");
  }

  const imported = [];
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const payload = {
      name: row.name || row.Name,
      geography: row.geography || row.Geography,
      selcoEmpanelled: normalizeBoolean(
        row.selcoEmpanelled ?? row.SelcoEmpanelled
      ),
      email: row.email || row.Email || null,
      description: row.description || row.Description || null,
      valueChain: row.valueChain || row.ValueChain || null,
      secondaryValueChain:
        row.secondaryValueChain || row.SecondaryValueChain || null,
      relatedFields: {
        interests: parseArray(row.interests || row.Interests),
        occupations: parseArray(row.occupations || row.Occupations),
        locations: parseArray(row.locations || row.Locations),
        participantCategories: parseArray(
          row.participantCategories || row.ParticipantCategories
        ),
      },
      status: row.status || row.Status || "ACTIVE",
    };

    const { error, value } = createVendorSchema.validate(payload, {
      abortEarly: false,
    });

    if (error) {
      errors.push({
        row: index + 2,
        message: error.details.map((item) => item.message).join(", "),
      });
      continue;
    }

    try {
      const vendor = await Vendor.create({
        ...value,
        createdBy: staffId,
        updatedBy: staffId,
      });

      imported.push(vendor);
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error.message,
      });
    }
  }

  return {
    importedCount: imported.length,
    failedCount: errors.length,
    errors,
  };
};

export default { importCsv };

import env from "../../config/env.js";
import ApiError from "../errors/ApiError.js";

const supportedLanguages = new Set(["en", "hi", "mr", "gu"]);

const translateTexts = async (texts, target) => {
  if (!Array.isArray(texts) || !texts.length || target === "en" || !env.googleTranslate.enabled) {
    return texts;
  }

  if (!supportedLanguages.has(target)) {
    throw new ApiError(400, "Unsupported registration language.");
  }

  if (!env.googleTranslate.apiKey) {
    // Safe fallback: registration still works in English if translation is not configured.
    return texts;
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(env.googleTranslate.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        source: "en",
        target,
        format: "text",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      502,
      data?.error?.message || "Translation service is unavailable."
    );
  }

  return (data?.data?.translations || []).map(
    (item, index) => item?.translatedText || texts[index]
  );
};

export default {
  supportedLanguages: [...supportedLanguages],
  translateTexts,
};

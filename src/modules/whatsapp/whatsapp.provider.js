import env from "../../config/env.js";
import ApiError from "../../shared/errors/ApiError.js";

const ensureTryowBotConfigured = (apiName) => {
  if (!env.whatsapp.enabled) {
    throw new ApiError(503, "WhatsApp service is disabled.");
  }

  if (!env.whatsapp.appId || !env.whatsapp.apiKey || !(apiName || env.whatsapp.apiName)) {
    throw new ApiError(
      503,
      "TryowBot WhatsApp is not configured. Add WHATSAPP_APP_ID, WHATSAPP_API_KEY and WHATSAPP_API_NAME."
    );
  }
};

const ensureMetaConfigured = () => {
  if (
    !env.whatsapp.enabled ||
    !env.whatsapp.phoneNumberId ||
    !env.whatsapp.accessToken
  ) {
    throw new ApiError(
      503,
      "Meta WhatsApp service is not configured."
    );
  }
};

const metaEndpoint = () =>
  `https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`;

const normalizeTryowBotParameters = ({ parameters, components = [] }) => {
  if (parameters && typeof parameters === "object") {
    return {
      header: parameters.header || {},
      body: parameters.body || {},
      button: parameters.button || {},
    };
  }

  const result = { header: {}, body: {}, button: {} };

  for (const component of components || []) {
    const type = String(component?.type || "").toLowerCase();
    const target = type === "header" || type === "button" ? type : "body";
    const params = component?.parameters || [];

    params.forEach((parameter, index) => {
      const key = `var${index + 1}`;
      const value =
        parameter?.text ??
        parameter?.value ??
        parameter?.image?.link ??
        parameter?.video?.link ??
        parameter?.document?.link ??
        "";
      result[target][key] = String(value);
    });
  }

  return result;
};

const sendTryowBotTemplate = async ({
  to,
  parameters,
  components,
  apiName,
}) => {
  ensureTryowBotConfigured(apiName);

  const campaignName = apiName || env.whatsapp.apiName;
  const recipient = String(to || "").replace(/\D/g, "");
  const parametersPayload = normalizeTryowBotParameters({ parameters, components });
  const requestPayload = {
    appid: env.whatsapp.appId,
    apikey: env.whatsapp.apiKey,
    apiname: campaignName,
    to: recipient,
    parameters: parametersPayload,
  };

  if (!recipient) {
    throw new ApiError(400, "WhatsApp recipient mobile number is empty.");
  }

  // TryowBot requires the API Campaign name (apiname), not the template name.
  // Keep the exact payload documented by TryowBot.
  const response = await fetch(env.whatsapp.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  console.log(
    `[whatsapp-tryowbot] send status=${response.status} apiname=${campaignName} to=${recipient} response=${JSON.stringify(data)}`
  );

  if (!response.ok || data?.error === true) {
    throw new ApiError(
      response.status || 502,
      data?.message || data?.errorMessage || "TryowBot WhatsApp message could not be sent."
    );
  }

  return {
    providerMessageId:
      data?.messageId ||
      data?.message_id ||
      data?.data?.messageId ||
      data?.data?.message_id ||
      null,
    raw: data,
  };
};

const sendMetaText = async ({ to, body }) => {
  ensureMetaConfigured();

  const response = await fetch(metaEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.message || "WhatsApp message could not be sent."
    );
  }

  return {
    providerMessageId: data?.messages?.[0]?.id || null,
    raw: data,
  };
};

const sendMetaTemplate = async ({
  to,
  templateName,
  languageCode,
  components = [],
}) => {
  ensureMetaConfigured();

  if (!templateName) {
    throw new ApiError(503, "WhatsApp template name is not configured.");
  }

  const response = await fetch(metaEndpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length ? { components } : {}),
      },
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.message || "WhatsApp template could not be sent."
    );
  }

  return {
    providerMessageId: data?.messages?.[0]?.id || null,
    raw: data,
  };
};


const ensureGupshupConfigured = () => {
  if (!env.whatsapp.enabled) throw new ApiError(503, "WhatsApp service is disabled.");
  const missing = [];
  if (!env.whatsapp.gupshupApiKey) missing.push("GUPSHUP_API_KEY");
  if (!env.whatsapp.gupshupAppName) missing.push("GUPSHUP_APP_NAME");
  if (!env.whatsapp.gupshupSource) missing.push("GUPSHUP_SOURCE");
  if (missing.length) throw new ApiError(503, `Gupshup WhatsApp is not configured. Missing: ${missing.join(", ")}.`);
};

const gupshupUrl = (path) => `${env.whatsapp.gupshupApiBaseUrl.replace(/\/$/, "")}${path}`;

const sendGupshupText = async ({ to, body }) => {
  ensureGupshupConfigured();
  const destination = String(to || "").replace(/\D/g, "");
  if (!destination) throw new ApiError(400, "WhatsApp recipient mobile number is empty.");
  const form = new URLSearchParams({
    channel: "whatsapp",
    source: env.whatsapp.gupshupSource,
    destination,
    "src.name": env.whatsapp.gupshupAppName,
    message: JSON.stringify({ type: "text", text: body, previewUrl: false }),
  });
  const response = await fetch(gupshupUrl("/wa/api/v1/msg"), {
    method: "POST",
    headers: { apikey: env.whatsapp.gupshupApiKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.status === "error") {
    throw new ApiError(response.status || 502, data?.message || "Gupshup WhatsApp text message failed.");
  }
  return { providerMessageId: data?.messageId || data?.message_id || null, raw: data };
};

const sendGupshupTemplate = async ({ to, templateName, templateId, languageCode, components = [], parameters = [], postbackTexts = [] }) => {
  ensureGupshupConfigured();

  // Gupshup requires the approved template UUID, not the template name.
  // Never fall back to the human-readable name.
  const approvedTemplateId = String(templateId || "").trim();
  if (!approvedTemplateId) {
    throw new ApiError(503, "GUPSHUP_WELCOME_TEMPLATE_ID is not configured.");
  }

  const destination = String(to || "").replace(/\D/g, "");
  if (!destination) throw new ApiError(400, "WhatsApp recipient mobile number is empty.");

  const params = parameters.length
    ? parameters
    : (components || []).flatMap((component) =>
        (component?.parameters || []).map((p) => p?.text ?? p?.value ?? "")
      );

  const form = new URLSearchParams({
    channel: "whatsapp",
    source: env.whatsapp.gupshupSource,
    destination,
    "src.name": env.whatsapp.gupshupAppName,
    template: JSON.stringify({ id: approvedTemplateId, params }),
  });

  if (postbackTexts?.length) form.set("postbackTexts", JSON.stringify(postbackTexts));

  const response = await fetch(gupshupUrl("/wa/api/v1/template/msg"), {
    method: "POST",
    headers: {
      apikey: env.whatsapp.gupshupApiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.status === "error") {
    throw new ApiError(
      response.status || 502,
      data?.message || "Gupshup WhatsApp template message failed."
    );
  }

  console.log(
    `[gupshup] template submitted destination=${destination} templateId=${approvedTemplateId} messageId=${data?.messageId || data?.message_id || "n/a"}`
  );

  return {
    providerMessageId: data?.messageId || data?.message_id || null,
    raw: data,
    languageCode,
    templateName,
    templateId: approvedTemplateId,
  };
};

const sendText = async ({ to, body }) => {
  if (env.whatsapp.provider === "gupshup") return sendGupshupText({ to, body });
  if (env.whatsapp.provider === "tryowbot") {
    throw new ApiError(400, "TryowBot API sends approved templates through API Campaigns. Configure a suitable template campaign before using free-text replies.");
  }
  return sendMetaText({ to, body });
};

const sendTemplate = async ({ to, templateName, templateId, languageCode, components = [], parameters, apiName, postbackTexts = [] }) => {
  if (env.whatsapp.provider === "gupshup") {
    return sendGupshupTemplate({ to, templateName, templateId, languageCode, components, parameters, postbackTexts });
  }
  if (env.whatsapp.provider === "tryowbot") return sendTryowBotTemplate({ to, parameters, components, apiName });
  return sendMetaTemplate({ to, templateName, languageCode, components });
};

const receiveMessages = async ({
  mobile,
  startDate,
  endDate,
  limit = 25,
  skip = 0,
}) => {
  ensureTryowBotConfigured();

  const payload = {
    appid: env.whatsapp.appId,
    apikey: env.whatsapp.apiKey,
    mobileno: String(mobile || "").replace(/\D/g, ""),
    startdate: startDate,
    enddate: endDate,
    limit,
    skip,
  };

  const method = env.whatsapp.receiveMethod === "POST" ? "POST" : "GET";
  const query = new URLSearchParams(payload);

  let response;
  if (method === "GET") {
    response = await fetch(`${env.whatsapp.receiveApiUrl}?${query.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    // TryowBot's documentation labels this endpoint GET but its sample uses
    // a body. Fall back to POST if the deployed API rejects the GET form.
    if (response.status === 405 || response.status === 415) {
      response = await fetch(env.whatsapp.receiveApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
  } else {
    response = await fetch(env.whatsapp.receiveApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error === true) {
    throw new ApiError(
      response.status || 502,
      data?.message || "TryowBot received-message API could not be read."
    );
  }

  return data;
};

export default {
  sendText,
  sendTemplate,
  receiveMessages,
};

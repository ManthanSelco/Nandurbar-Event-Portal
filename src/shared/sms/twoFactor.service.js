const sendOtpSms = async ({
  mobile,
  countryCode = "+91",
  otp,
}) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;

  if (!apiKey) {
    throw new Error("TWOFACTOR_API_KEY is not configured.");
  }

  const phoneNumber = `${countryCode}${mobile}`;

  const url =
    `https://2factor.in/API/V1/${apiKey}/SMS/${phoneNumber}/${otp}`;

  const response = await fetch(url, {
    method: "POST",
  });

  const rawResponse = await response.text();

  console.log("========== 2FACTOR ==========");
  console.log("HTTP Status:", response.status);
  console.log("Response:", rawResponse);
  console.log("==============================");

  let data;

  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(
      `2Factor returned invalid response: ${rawResponse.substring(0, 300)}`
    );
  }

  if (!response.ok || data?.Status !== "Success") {
    throw new Error(
      data?.Details || "Failed to send OTP SMS."
    );
  }

  return data;
};

export default {
  sendOtpSms,
};
const sendOtpSms = async ({
  mobile,
  countryCode = "+91",
  otp,
}) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TWOFACTOR_API_KEY is not configured."
    );
  }

  const phoneNumber = `${countryCode}${mobile}`;

  const url =
    `https://2factor.in/API/V1/${apiKey}/SMS/${phoneNumber}/${otp}`;

  console.log("========== 2FACTOR ==========");
  console.log("Sending OTP to:", phoneNumber);
  console.log("URL:", url.replace(apiKey, "********"));
  
  const response = await fetch(url, {
    method: "POST",
  });

  const responseText = await response.text();

  console.log("HTTP Status:", response.status);
  console.log("Response:", responseText);
  console.log("==============================");

  let data;

  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `2Factor returned invalid response. HTTP ${response.status}: ${responseText}`
    );
  }

  if (
    !response.ok ||
    data?.Status !== "Success"
  ) {
    throw new Error(
      data?.Details ||
        "Failed to send OTP through 2Factor."
    );
  }

  return data;
};

export default {
  sendOtpSms,
};
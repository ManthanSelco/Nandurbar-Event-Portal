import jwt from "jsonwebtoken";
import env from "../../config/env.js";

/**
 * Generate JWT Access Token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

/**
 * Verify JWT Token
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};
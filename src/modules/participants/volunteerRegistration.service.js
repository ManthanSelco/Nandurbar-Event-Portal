import crypto from "crypto";

import VolunteerRegistration from "./volunteerRegistration.model.js";
import ApiError from "../../shared/errors/ApiError.js";

const LINK_DURATION = 24 * 60 * 60 * 1000;

const generateToken = () =>
  crypto.randomBytes(32).toString("hex");

const createVolunteerLink = async (payload, staffId) => {
  if (!staffId) {
    throw new ApiError(
      401,
      "Staff authentication required."
    );
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + LINK_DURATION);

  const registration =
    await VolunteerRegistration.create({
      token,
      volunteerName: payload.volunteerName,
      volunteerMobile: payload.volunteerMobile,
      createdBy: staffId,
      maxRegistrations: 10,
      registrationCount: 0,
      expiresAt,
    });

  return {
    token: registration.token,
    volunteerName: registration.volunteerName,
    volunteerMobile: registration.volunteerMobile,
    expiresAt: registration.expiresAt,
  };
};

const validateVolunteerToken=async token=>{if(!token)throw new ApiError(401,"Volunteer registration token is required.");const r=await VolunteerRegistration.findOne({token,isActive:true});if(!r)throw new ApiError(401,"Invalid or expired volunteer registration link.");if(r.expiresAt.getTime()<Date.now()){await VolunteerRegistration.updateOne({_id:r._id},{$set:{isActive:false}});throw new ApiError(401,"Volunteer registration link has expired.")}if(r.registrationCount>=r.maxRegistrations)throw new ApiError(409,"This volunteer registration link has reached its participant limit.");return r};
const reserveRegistrationSlot=async token=>{const r=await VolunteerRegistration.findOneAndUpdate({token,isActive:true,expiresAt:{$gt:new Date()},$expr:{$lt:["$registrationCount","$maxRegistrations"]}},{$inc:{registrationCount:1}},{new:true});if(!r)throw new ApiError(409,"This volunteer registration link is unavailable or has reached its 10 participant limit.");return r};
const releaseRegistrationSlot=async token=>{await VolunteerRegistration.updateOne({token,registrationCount:{$gt:0}},{$inc:{registrationCount:-1}})};
const deactivateToken=async token=>{await VolunteerRegistration.updateOne({token},{$set:{isActive:false}})};

export default {
  createVolunteerLink,
  validateVolunteerToken,
  deactivateToken,
  reserveRegistrationSlot,
  releaseRegistrationSlot,
};

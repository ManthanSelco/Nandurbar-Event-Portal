export const staffResponse = (staff) => ({
  id: staff._id,
  name: staff.name,
  email: staff.email,
  countryCode: staff.countryCode,
  mobile: staff.mobile,
  role: staff.role,
  isActive: staff.isActive,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});
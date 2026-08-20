import bcrypt from "bcryptjs";
import Staff from "../staff/staff.model.js";

const seedAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

    const password = process.env.ADMIN_PASSWORD;
    const mobile = process.env.ADMIN_MOBILE;

    if (!email || !password || !mobile) {
      throw new Error(
        "ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_MOBILE must be configured in .env"
      );
    }

    let admin = await Staff.findOne({
      email,
    }).select("+password");

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    if (admin) {
      admin.password = hashedPassword;
      admin.role = "SUPER_ADMIN";
      admin.emailVerified = true;
      admin.isActive = true;
      admin.isDeleted = false;
      admin.deletedAt = null;
      admin.deletedBy = null;

      await admin.save();

      console.log("✅ Super Admin verified/updated.");
      return;
    }

    await Staff.create({
      name: "Super Admin",
      email,
      emailVerified: true,
      password: hashedPassword,
      countryCode: "+91",
      mobile,
      role: "SUPER_ADMIN",
      isActive: true,
      isDeleted: false,
      createdBy: null,
    });

    console.log("✅ Super Admin created successfully.");
  } catch (error) {
    console.error(
      "❌ Seed Admin Error:",
      error.message
    );
  }
};

export default seedAdmin;
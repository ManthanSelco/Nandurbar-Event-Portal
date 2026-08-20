import mongoose from "mongoose";
import env from "./env.js";

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(env.mongoUri);

    console.log("======================================");
    console.log("✅ MongoDB Connected Successfully");
    console.log(`📦 Database : ${connection.connection.name}`);
    console.log(`🌐 Host     : ${connection.connection.host}`);
    console.log("======================================");
  } catch (error) {
    console.error("======================================");
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    console.error("======================================");

    process.exit(1);
  }
};

export default connectDatabase;
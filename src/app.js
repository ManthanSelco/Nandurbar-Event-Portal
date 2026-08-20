import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import routes from "./routes/index.js";
import notFound from "./middleware/notFound.middleware.js";
import errorHandler from "./middleware/error.middleware.js";

const app = express();

// Security
app.use(helmet());



const allowedOrigins = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin is not allowed."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Volunteer-Token"],
  })
);

// Logger
app.use(morgan("dev"));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Participant Journey API Running 🚀",
  });
});

// API Routes
app.use("/api/v1", routes);

// 404 Middleware (Always Last)
app.use(notFound);

// Global Error Handler (Always Last)
app.use(errorHandler);

export default app;
global.crypto = require("crypto"); // The Alpine Linux Fix

const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const Redis = require("ioredis");
const connectDB = require("./config/db");
const resumeRoutes = require("./routes/resumeRoutes");
const authRoutes = require("./routes/authRoutes");
const requireAuth = require("./middleware/requireAuth");
const { getAllowedOrigins, requireTrustedOrigin } = require("./middleware/requireTrustedOrigin");

connectDB();

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || getAllowedOrigins().has(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/api", requireTrustedOrigin);

// Initialize Upstash Redis Client
const redisClient = new Redis(process.env.UPSTASH_REDIS_URL);

// The Token Bucket Rate Limiter (Now backed by Cloud Redis)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: { error: "Rate limit exceeded. Please try again in 15 minutes." },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Please try again later." },
});
app.post("/api/auth/signup", authRateLimiter);
app.post("/api/auth/login", authRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/resumes/:id/match", apiLimiter);
app.post("/api/resumes", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many uploads. Please try again later." },
}));
app.use("/api/resumes", requireAuth, resumeRoutes);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      message: status === 413 ? "Resume files must be 10 MB or smaller." : "Invalid file upload.",
    });
  }

  console.error("Unhandled request error:", error);
  return res.status(500).json({ message: "Server Error" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

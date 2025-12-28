import cors from "cors";
import morgan from "morgan";
import e from "express";
import dotenv from "dotenv";
import UpstoxClient from "upstox-js-sdk";
import googleSheetRoute from "./Routes/googleSheetRoute.mjs";
import upstoxRoute from "./Routes/upstoxRoute.mjs";
import callbackRoute from "./Routes/callbackRoute.mjs";
dotenv.config();

const app = e();
// Req logging
app.use(morgan("dev"));

// cors
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin.includes("http://localhost:4000")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// allow export json from body
app.use(e.json());

// Linking Routes
app.use("/api/v1/googleSheet", googleSheetRoute);
app.use("/api/v1/upstox", upstoxRoute);
app.use("/callback", callbackRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error!",
  });
});
// Launching Server
app.listen(3000, () => {
  console.log(`Server is up and running on port: 3000`);
});

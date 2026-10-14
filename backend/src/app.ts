
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import campaignRoutes from "./routes/campaign.routes";
import submissionRoutes from "./routes/submission.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/submissions", submissionRoutes);

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Meme'd Payout Tracker API is running",
  });
});

export default app;

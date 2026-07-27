import express from "express";
import cors from "cors";
import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();

app.use(cors());
// 사진 첨부 소식은 base64 data URL을 본문에 담으므로 Express 기본 100KB 제한보다 크게 받는다.
app.use(express.json({ limit: "6mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

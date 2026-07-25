import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("14d"),
  SMS_API_KEY: z.string().optional().default(""),
  SMS_API_SECRET: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.6-flash"),
  MAIL_SEND_API_KEY: z.string().optional().default(""),
  // 웹/iOS/Android 클라이언트 ID를 콤마로 구분해 등록 (Google Cloud Console에서 각각 발급)
  GOOGLE_CLIENT_IDS: z.string().min(1, "GOOGLE_CLIENT_IDS is required"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("환경 변수 검증 실패:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. .env.example을 참고해 .env를 채워주세요.");
}

export const env = {
  ...parsed.data,
  GOOGLE_CLIENT_IDS: parsed.data.GOOGLE_CLIENT_IDS.split(",").map((id) => id.trim()),
};

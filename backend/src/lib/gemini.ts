import { env } from "../config/env";
import { HttpError } from "../middleware/error.middleware";

export interface DraftRequest {
  channel: "EMAIL" | "TEXT";
  occasion: string;
  recipientType: string;
  contactName: string;
  contactAffiliation?: string | null;
  senderName: string;
  /** 사용자가 직접 입력한 이메일 제목. 있으면 AI가 새로 짓지 않고 그대로 사용한다. */
  subject?: string;
}

export interface DraftResult {
  subject: string;
  body: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function buildPrompt(req: DraftRequest): string {
  const channelLabel = req.channel === "EMAIL" ? "이메일" : "문자 메시지(SMS/카카오톡)";

  return [
    `너는 인맥 관리 앱에서 사용자의 연락 초안을 대신 작성해주는 어시스턴트야.`,
    `아래 조건에 맞는 ${channelLabel} 초안을 한국어로 작성해줘.`,
    ``,
    `- 보내는 사람: ${req.senderName}`,
    `- 받는 사람: ${req.contactName}${req.contactAffiliation ? ` (${req.contactAffiliation})` : ""}`,
    `- 관계/받는 사람 유형: ${req.recipientType}`,
    `- 연락 목적/상황: ${req.occasion}`,
    ``,
    req.channel === "EMAIL"
      ? req.subject
        ? `이메일 본문만 작성해줘. 제목은 사용자가 "${req.subject}"로 이미 정했으니 그대로 SUBJECT에 써줘.`
        : `이메일 제목과 본문을 작성해줘. 정중하고 상황에 맞는 존댓말을 사용해줘.`
      : `짧고 자연스러운 문자 메시지 본문만 작성해줘 (제목 없음). 너무 격식 차리지 않되 예의는 지켜줘.`,
    ``,
    `반드시 아래 형식 그대로, 다른 설명 없이 출력해:`,
    `SUBJECT: (이메일 제목, 문자인 경우 빈 값)`,
    `BODY:`,
    `(본문 내용)`,
  ].join("\n");
}

function parseDraftResponse(text: string, channel: "EMAIL" | "TEXT"): DraftResult {
  const subjectMatch = text.match(/SUBJECT:\s*(.*)/);
  const bodyIndex = text.indexOf("BODY:");

  const subject = channel === "EMAIL" ? (subjectMatch?.[1]?.trim() ?? "") : "";
  const body = bodyIndex >= 0 ? text.slice(bodyIndex + "BODY:".length).trim() : text.trim();

  return { subject, body };
}

export async function generateContactDraft(req: DraftRequest): Promise<DraftResult> {
  if (!env.GEMINI_API_KEY) {
    throw new HttpError(503, "Gemini API 키가 설정되지 않았습니다. 서버 .env의 GEMINI_API_KEY를 채워주세요.");
  }

  const prompt = buildPrompt(req);
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(env.GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
  } catch (err) {
    console.error("[gemini] request failed:", err);
    throw new HttpError(502, "Gemini API에 연결하지 못했습니다. 서버 네트워크를 확인해주세요.");
  }

  const payload = (await response.json().catch(() => ({}))) as GeminiGenerateResponse;
  if (!response.ok) {
    const apiErrorMessage = payload.error?.message ?? "Unknown error";
    console.error(`[gemini] API failed (${response.status}):`, apiErrorMessage);
    if (apiErrorMessage.toLowerCase().includes("api key not valid")) {
      throw new HttpError(502, "Gemini API 키가 유효하지 않습니다. backend/.env의 키 형식을 확인해주세요.");
    }
    if (response.status === 403) {
      throw new HttpError(502, "Gemini API 키의 권한 또는 API 활성화 상태를 확인해주세요.");
    }
    if (response.status === 404) {
      throw new HttpError(502, `Gemini 모델을 사용할 수 없습니다: ${env.GEMINI_MODEL}`);
    }
    if (response.status === 429) {
      throw new HttpError(429, "Gemini API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
    }
    throw new HttpError(502, "AI 초안 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new HttpError(502, "Gemini가 빈 응답을 반환했습니다.");
  }

  const parsed = parseDraftResponse(text, req.channel);
  // AI가 지시를 어기고 제목을 바꿔 쓰는 경우를 대비해, 사용자가 직접 입력한 제목은 그대로 강제한다.
  if (req.channel === "EMAIL" && req.subject) {
    return { ...parsed, subject: req.subject };
  }
  return parsed;
}

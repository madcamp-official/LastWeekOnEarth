import { env } from "../config/env";
import { HttpError } from "../middleware/error.middleware";

export interface DraftRequest {
  channel: "EMAIL" | "TEXT";
  occasion: string;
  recipientType: string;
  /** 그룹 공통 초안(개인화 없음)일 때는 비워둔다. */
  contactName?: string;
  contactAffiliation?: string | null;
  senderName: string;
  /** 사용자가 직접 입력한 이메일 제목. 있으면 AI가 새로 짓지 않고 그대로 사용한다. */
  subject?: string;
  /** 축하/생일 등 상황일 때 "무엇을 축하하는지" (예: 합격, 승진, 생일). */
  celebrationDetail?: string;
  /** 그룹 중 특정 한 명을 축하하는 경우 그 사람 이름. contactName과 같은 사람이면 본인에게
   * 직접 축하하는 문구로, 다르면 "함께 축하해요" 식으로 지어달라고 안내한다. */
  celebrantName?: string;
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

  const recipientLine = req.contactName
    ? `- 받는 사람: ${req.contactName}${req.contactAffiliation ? ` (${req.contactAffiliation})` : ""}`
    : `- 받는 사람: 그룹 구성원 전체 (한 사람이 아니라 여러 명에게 똑같이 보낼 공통 메시지야. 특정 개인 이름으로 부르지 말고 다같이 부를 수 있는 인사말로 시작해줘.)`;

  const celebrationLines: string[] = [];
  if (req.celebrationDetail) {
    celebrationLines.push(`- 축하하는 대상/사유: ${req.celebrationDetail}`);
  }
  if (req.celebrantName) {
    if (req.contactName && req.contactName === req.celebrantName) {
      celebrationLines.push(`- 이 메시지는 축하 대상인 ${req.celebrantName}님 본인에게 직접 보내는 축하 메시지야.`);
    } else {
      celebrationLines.push(
        `- 이 메시지는 ${req.celebrantName}님을 축하하는 소식을 다른 사람(들)에게 전하는 메시지야. 받는 사람이 함께 ${req.celebrantName}님을 축하할 수 있도록 문구를 작성해줘.`,
      );
    }
  }

  return [
    `너는 인맥 관리 앱에서 사용자의 연락 초안을 대신 작성해주는 어시스턴트야.`,
    `아래 조건에 맞는 ${channelLabel} 초안을 한국어로 작성해줘.`,
    ``,
    `- 보내는 사람: ${req.senderName}`,
    recipientLine,
    `- 관계/받는 사람 유형: ${req.recipientType}`,
    `- 연락 목적/상황: ${req.occasion}`,
    ...celebrationLines,
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

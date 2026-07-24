import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

/**
 * AI 메일 초안 생성 클라이언트.
 * 실제 프롬프트 구성(상대 정보 + CV + 톤 지시)은 mail 기능 구현 시 채운다.
 * ANTHROPIC_API_KEY는 반드시 서버에서만 사용하며 클라이언트에 노출하지 않는다 (CLAUDE.md 섹션 8).
 */
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface MailDraftInput {
  recipientName: string;
  recipientAffiliation?: string | null;
  memo?: string | null;
  lastContactedAt?: Date | null;
  lastContactChannel?: string | null;
  senderCvHighlights: string[];
}

export interface MailDraftOutput {
  subject: string;
  body: string;
}

export async function generateMailDraft(_input: MailDraftInput): Promise<MailDraftOutput> {
  throw new Error("Not implemented: mail 기능 구현 시 Anthropic API 호출 로직을 채운다.");
}

import { api } from "./api";

export type MailChannel = "EMAIL" | "TEXT";
export type MailDraftStatus = "DRAFT" | "SCHEDULED" | "SENT";

export interface MailDraftContact {
  id: string;
  name: string;
  affiliation: string | null;
  photoUrl: string | null;
}

export interface MailDraftGroup {
  id: string;
  name: string;
}

export interface MailDraft {
  id: string;
  ownerUserId: string;
  contactId: string | null;
  contact: MailDraftContact | null;
  groupId: string | null;
  group: MailDraftGroup | null;
  subject: string;
  body: string;
  channel: MailChannel;
  status: MailDraftStatus;
  scheduledAt: string | null;
  createdAt: string;
}

export interface GenerateDraftInput {
  contactId: string;
  occasion: string;
  recipientType: string;
  channel: MailChannel;
  subject?: string;
  /** "축하 인사" 등일 때 무엇을 축하하는지 (예: 합격, 승진, 생일). */
  celebrationDetail?: string;
}

export type GroupDraftMode = "SHARED" | "PER_MEMBER";

export interface BatchGenerateDraftInput {
  groupId: string;
  occasion: string;
  recipientType: string;
  channel: MailChannel;
  subject?: string;
  celebrationDetail?: string;
  /** 축하 상황일 때, 그룹 구성원 중 누구를 축하하는지. */
  celebrantContactId?: string;
  /** SHARED: 전체에게 보낼 공통 초안 1개. PER_MEMBER: 구성원별 개인화 초안 여러 개. */
  mode: GroupDraftMode;
}

export interface DraftUpdateInput {
  subject?: string;
  body?: string;
  status?: MailDraftStatus;
  scheduledAt?: string;
}

export const mailApi = {
  list: () => api.get<MailDraft[]>("/mail-drafts").then((res) => res.data),

  get: (id: string) => api.get<MailDraft>(`/mail-drafts/${id}`).then((res) => res.data),

  generate: (input: GenerateDraftInput) =>
    api.post<MailDraft>("/mail-drafts/generate", input).then((res) => res.data),

  batchGenerate: (input: BatchGenerateDraftInput) =>
    api.post<MailDraft[]>("/mail-drafts/batch-generate", input).then((res) => res.data),

  update: (id: string, input: DraftUpdateInput) =>
    api.patch<MailDraft>(`/mail-drafts/${id}`, input).then((res) => res.data),

  remove: (id: string) => api.delete(`/mail-drafts/${id}`),

  send: (id: string) => api.post<MailDraft & { gmailMessageId: string }>(`/mail-drafts/${id}/send`).then((res) => res.data),

  schedule: (id: string, scheduledAt: Date) =>
    api
      .patch<MailDraft>(`/mail-drafts/${id}`, { status: "SCHEDULED", scheduledAt: scheduledAt.toISOString() })
      .then((res) => res.data),
};

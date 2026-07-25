import { api } from "./api";

export type MailChannel = "EMAIL" | "TEXT";
export type MailDraftStatus = "DRAFT" | "SCHEDULED" | "SENT";

export interface MailDraftContact {
  id: string;
  name: string;
  affiliation: string | null;
  photoUrl: string | null;
}

export interface MailDraft {
  id: string;
  ownerUserId: string;
  contactId: string | null;
  contact: MailDraftContact | null;
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
}

export interface BatchGenerateDraftInput {
  groupId: string;
  occasion: string;
  recipientType: string;
  channel: MailChannel;
  subject?: string;
}

export interface DraftUpdateInput {
  subject?: string;
  body?: string;
  status?: MailDraftStatus;
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
};

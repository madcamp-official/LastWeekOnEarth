import { api } from "./api";

export type ContactSource = "MANUAL" | "BLE";
export type LogChannel = "EMAIL" | "CALL" | "MEETING" | "OTHER";
export type ContactMethod = "EMAIL" | "KAKAO" | "CALL" | "OTHER";

export interface Contact {
  id: string;
  name: string;
  affiliation: string | null;
  email: string | null;
  phone: string | null;
  memo: string | null;
  photoUrl: string | null;
  contactMethod: ContactMethod;
  source: ContactSource;
  targetUserId: string | null;
  // 계정과 연결된 인맥이면, 상대가 마이페이지에 등록해둔 모든 이메일(대표 포함, 대표가 맨 앞).
  linkedEmails?: string[];
  lastContactedAt: string | null;
  createdAt: string;
}

export interface ContactEmail {
  id: string;
  contactId: string;
  email: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ContactLog {
  id: string;
  contactId: string;
  channel: LogChannel;
  memo: string | null;
  contactedAt: string;
}

export interface ContactInput {
  name: string;
  affiliation?: string | null;
  email?: string;
  phone?: string | null;
  memo?: string | null;
  photoUrl?: string | null;
  contactMethod?: ContactMethod;
}

// 나를 등록했지만 나는 아직 등록하지 않은 사용자 (단방향 인맥 등록의 반대편 목록).
export interface IncomingUser {
  id: string;
  name: string;
  affiliation: string | null;
  avatarUrl: string | null;
}

export const contactsApi = {
  list: () => api.get<Contact[]>("/contacts").then((res) => res.data),

  get: (id: string) => api.get<Contact>(`/contacts/${id}`).then((res) => res.data),

  create: (input: ContactInput) => api.post<Contact>("/contacts", input).then((res) => res.data),

  update: (id: string, input: Partial<ContactInput>) =>
    api.patch<Contact>(`/contacts/${id}`, input).then((res) => res.data),

  remove: (id: string) => api.delete(`/contacts/${id}`),

  reorder: (order: string[]) => api.patch("/contacts/reorder", { order }),

  addLog: (id: string, channel: LogChannel, memo?: string) =>
    api.post<ContactLog>(`/contacts/${id}/logs`, { channel, memo }).then((res) => res.data),

  listLogs: (id: string) => api.get<ContactLog[]>(`/contacts/${id}/logs`).then((res) => res.data),

  issueBleToken: () =>
    api
      .post<{ token: string; expiresAt: string }>("/contacts/ble-token")
      .then((res) => res.data),

  bleTag: (token: string) => api.post<Contact>("/contacts/ble-tag", { token }).then((res) => res.data),

  previewBleCode: (token: string) =>
    api
      .get<{ userId: string; name: string; affiliation: string | null; avatarUrl: string | null }>(
        `/contacts/ble-preview/${token}`,
      )
      .then((res) => res.data),

  listEmails: (id: string) => api.get<ContactEmail[]>(`/contacts/${id}/emails`).then((res) => res.data),

  addEmail: (id: string, email: string) =>
    api.post<ContactEmail>(`/contacts/${id}/emails`, { email }).then((res) => res.data),

  updateEmail: (id: string, emailId: string, email: string) =>
    api.patch<ContactEmail>(`/contacts/${id}/emails/${emailId}`, { email }).then((res) => res.data),

  setPrimaryEmail: (id: string, emailId: string) =>
    api.post<Contact>(`/contacts/${id}/emails/${emailId}/primary`).then((res) => res.data),

  removeEmail: (id: string, emailId: string) => api.delete(`/contacts/${id}/emails/${emailId}`),

  listIncoming: () => api.get<IncomingUser[]>("/contacts/incoming").then((res) => res.data),

  addFromIncoming: (userId: string) =>
    api.post<Contact>(`/contacts/incoming/${userId}`).then((res) => res.data),
};

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

export const contactsApi = {
  list: () => api.get<Contact[]>("/contacts").then((res) => res.data),

  get: (id: string) => api.get<Contact>(`/contacts/${id}`).then((res) => res.data),

  create: (input: ContactInput) => api.post<Contact>("/contacts", input).then((res) => res.data),

  update: (id: string, input: Partial<ContactInput>) =>
    api.patch<Contact>(`/contacts/${id}`, input).then((res) => res.data),

  remove: (id: string) => api.delete(`/contacts/${id}`),

  addLog: (id: string, channel: LogChannel, memo?: string) =>
    api.post<ContactLog>(`/contacts/${id}/logs`, { channel, memo }).then((res) => res.data),

  listLogs: (id: string) => api.get<ContactLog[]>(`/contacts/${id}/logs`).then((res) => res.data),

  issueBleToken: () =>
    api
      .post<{ token: string; expiresAt: string }>("/contacts/ble-token")
      .then((res) => res.data),

  bleTag: (token: string) => api.post<Contact>("/contacts/ble-tag", { token }).then((res) => res.data),

  listEmails: (id: string) => api.get<ContactEmail[]>(`/contacts/${id}/emails`).then((res) => res.data),

  addEmail: (id: string, email: string) =>
    api.post<ContactEmail>(`/contacts/${id}/emails`, { email }).then((res) => res.data),

  setPrimaryEmail: (id: string, emailId: string) =>
    api.post<Contact>(`/contacts/${id}/emails/${emailId}/primary`).then((res) => res.data),

  removeEmail: (id: string, emailId: string) => api.delete(`/contacts/${id}/emails/${emailId}`),
};

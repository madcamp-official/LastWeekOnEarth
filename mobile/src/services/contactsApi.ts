import { api } from "./api";

export type ContactSource = "MANUAL" | "BLE";
export type LogChannel = "EMAIL" | "CALL" | "MEETING" | "OTHER";

export interface Contact {
  id: string;
  name: string;
  affiliation: string | null;
  email: string | null;
  phone: string | null;
  memo: string | null;
  photoUrl: string | null;
  source: ContactSource;
  lastContactedAt: string | null;
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
  affiliation?: string;
  email?: string;
  phone?: string;
  memo?: string;
  photoUrl?: string;
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
};

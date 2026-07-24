import { api } from "./api";
import type { Contact } from "./contactsApi";

export interface ContactGroup {
  id: string;
  name: string;
  frequencyDays: number;
  createdAt: string;
  memberCount: number;
}

export interface ContactGroupDetail {
  id: string;
  name: string;
  frequencyDays: number;
  createdAt: string;
  contacts: Contact[];
}

export interface GroupInput {
  name: string;
  frequencyDays: number;
}

export const groupsApi = {
  list: () => api.get<ContactGroup[]>("/groups").then((res) => res.data),

  get: (id: string) => api.get<ContactGroupDetail>(`/groups/${id}`).then((res) => res.data),

  create: (input: GroupInput) => api.post<ContactGroup>("/groups", input).then((res) => res.data),

  update: (id: string, input: Partial<GroupInput>) =>
    api.patch<ContactGroup>(`/groups/${id}`, input).then((res) => res.data),

  remove: (id: string) => api.delete(`/groups/${id}`),

  addMember: (id: string, contactId: string) =>
    api.post(`/groups/${id}/members`, { contactId }).then((res) => res.data),

  removeMember: (id: string, contactId: string) => api.delete(`/groups/${id}/members/${contactId}`),

  overdue: (id: string) => api.get<Contact[]>(`/groups/${id}/overdue`).then((res) => res.data),
};

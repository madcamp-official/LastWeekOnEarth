import { api } from "./api";

export interface GmailStatus {
  connected: boolean;
  grantedEmail: string | null;
}

export const gmailApi = {
  status: () => api.get<GmailStatus>("/mail/gmail/status").then((res) => res.data),

  connect: () => api.get<{ consentUrl: string }>("/mail/gmail/connect").then((res) => res.data),

  disconnect: () => api.delete("/mail/gmail"),
};

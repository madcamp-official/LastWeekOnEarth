import { api } from "./api";

export interface NotificationActor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  contactId: string | null;
  groupId: string | null;
  actorId: string | null;
  actor: NotificationActor | null;
  postId: string | null;
  messageId: string | null;
  type: string;
  scheduledAt: string;
  sent: boolean;
  read: boolean;
  createdAt: string;
  contact: { id: string; name: string } | null;
}

export const notificationsApi = {
  list: () => api.get<AppNotification[]>("/notifications").then((res) => res.data),

  unreadCount: () => api.get<{ count: number }>("/notifications/unread-count").then((res) => res.data.count),

  markRead: (id: string) => api.patch<AppNotification>(`/notifications/${id}/read`).then((res) => res.data),

  markAllRead: () => api.patch("/notifications/read-all"),
};

import { api } from "./api";
import type { PostAuthor } from "./postsApi";

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  postId: string | null;
  post: { id: string; content: string; authorId: string } | null;
  photoUrl: string | null;
  sharedProfileId: string | null;
  sharedProfile: PostAuthor | null;
  sharedContactId: string | null;
  sharedContact: { id: string; name: string; affiliation: string | null; photoUrl: string | null } | null;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  partner: PostAuthor;
  lastMessage: Message;
  unreadCount: number;
}

export interface SendMessageInput {
  content?: string;
  postId?: string;
  photoUrl?: string;
  sharedProfileId?: string;
  sharedContactId?: string;
}

export const messagesApi = {
  unreadCount: () => api.get<{ count: number }>("/messages/unread-count").then((res) => res.data.count),

  listContacts: () => api.get<PostAuthor[]>("/messages/contacts").then((res) => res.data),

  listConversations: () => api.get<Conversation[]>("/messages/conversations").then((res) => res.data),

  getThread: (userId: string) =>
    api.get<Message[]>(`/messages/conversations/${userId}/thread`).then((res) => res.data),

  send: (userId: string, input: SendMessageInput) =>
    api.post<Message>(`/messages/conversations/${userId}`, input).then((res) => res.data),

  markRead: (userId: string) => api.patch(`/messages/conversations/${userId}/read`),
};

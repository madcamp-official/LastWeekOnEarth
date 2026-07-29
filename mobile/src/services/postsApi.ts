import { api } from "./api";

export interface PostAuthor {
  id: string;
  name: string;
  affiliation: string | null;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  photoUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface PostLiker extends PostAuthor {
  likedAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
}

export interface CreatePostInput {
  content: string;
  photoUrl?: string;
}

export const postsApi = {
  listMine: () => api.get<Post[]>("/posts/me").then((res) => res.data),

  listFeed: () => api.get<Post[]>("/posts/feed").then((res) => res.data),

  get: (id: string) => api.get<Post>(`/posts/${id}`).then((res) => res.data),

  create: (input: CreatePostInput) => api.post<Post>("/posts", input).then((res) => res.data),

  remove: (id: string) => api.delete(`/posts/${id}`),

  like: (id: string) => api.post<{ likedByMe: boolean; likeCount: number }>(`/posts/${id}/like`).then((res) => res.data),

  unlike: (id: string) => api.delete<{ likedByMe: boolean; likeCount: number }>(`/posts/${id}/like`).then((res) => res.data),

  listLikes: (id: string) => api.get<PostLiker[]>(`/posts/${id}/likes`).then((res) => res.data),

  listComments: (id: string) => api.get<PostComment[]>(`/posts/${id}/comments`).then((res) => res.data),

  addComment: (id: string, content: string) =>
    api.post<PostComment>(`/posts/${id}/comments`, { content }).then((res) => res.data),

  removeComment: (postId: string, commentId: string) => api.delete(`/posts/${postId}/comments/${commentId}`),
};

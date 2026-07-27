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
}

export interface CreatePostInput {
  content: string;
  photoUrl?: string;
}

export const postsApi = {
  listMine: () => api.get<Post[]>("/posts/me").then((res) => res.data),

  listFeed: () => api.get<Post[]>("/posts/feed").then((res) => res.data),

  create: (input: CreatePostInput) => api.post<Post>("/posts", input).then((res) => res.data),

  remove: (id: string) => api.delete(`/posts/${id}`),
};

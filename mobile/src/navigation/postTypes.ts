export type PostStackParamList = {
  PostFeed: { initialTab?: "MINE" | "NEIGHBORS"; refreshKey?: number } | undefined;
  CreatePost: undefined;
  PostLikes: { postId: string };
  PostDetail: { postId: string };
  Notifications: undefined;
  Conversations: undefined;
  NewConversation: undefined;
  ChatThread: { userId: string; userName: string; postId?: string; initialMessage?: string };
  ShareProfile: { userId: string; userName: string };
};

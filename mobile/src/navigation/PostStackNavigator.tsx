import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PostStackParamList } from "./postTypes";
import { PostFeedScreen } from "../screens/PostFeedScreen";
import { CreatePostScreen } from "../screens/CreatePostScreen";
import { PostLikesScreen } from "../screens/PostLikesScreen";
import { PostDetailScreen } from "../screens/PostDetailScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ConversationsScreen } from "../screens/ConversationsScreen";
import { NewConversationScreen } from "../screens/NewConversationScreen";
import { ChatThreadScreen } from "../screens/ChatThreadScreen";
import { ShareProfileScreen } from "../screens/ShareProfileScreen";

const Stack = createNativeStackNavigator<PostStackParamList>();

export function PostStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="PostFeed" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PostFeed" component={PostFeedScreen} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="PostLikes" component={PostLikesScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="NewConversation" component={NewConversationScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="ShareProfile" component={ShareProfileScreen} />
    </Stack.Navigator>
  );
}

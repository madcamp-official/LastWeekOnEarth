import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { PostStackParamList } from "./postTypes";
import { PostFeedScreen } from "../screens/PostFeedScreen";
import { CreatePostScreen } from "../screens/CreatePostScreen";

const Stack = createNativeStackNavigator<PostStackParamList>();

export function PostStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="PostFeed">
      <Stack.Screen name="PostFeed" component={PostFeedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: "소식 올리기" }} />
    </Stack.Navigator>
  );
}

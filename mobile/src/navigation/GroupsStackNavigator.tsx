import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { GroupsStackParamList } from "./groupsTypes";
import { GroupsListScreen } from "../screens/GroupsListScreen";
import { CreateGroupScreen } from "../screens/CreateGroupScreen";
import { GroupDetailScreen } from "../screens/GroupDetailScreen";

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export function GroupsStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="GroupsList">
      <Stack.Screen name="GroupsList" component={GroupsListScreen} options={{ title: "그룹" }} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: "새 그룹" }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: "그룹 상세" }} />
    </Stack.Navigator>
  );
}

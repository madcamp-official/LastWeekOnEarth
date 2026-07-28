import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { MailStackParamList } from "./mailTypes";
import { MailListScreen } from "../screens/MailListScreen";
import { ComposeMailScreen } from "../screens/ComposeMailScreen";
import { MailDraftDetailScreen } from "../screens/MailDraftDetailScreen";
import { GmailSettingsScreen } from "../screens/GmailSettingsScreen";

const Stack = createNativeStackNavigator<MailStackParamList>();

export function MailStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="MailList">
      <Stack.Screen name="MailList" component={MailListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ComposeMail" component={ComposeMailScreen} options={{ title: "새 초안" }} />
      <Stack.Screen name="MailDraftDetail" component={MailDraftDetailScreen} options={{ title: "초안" }} />
      <Stack.Screen name="GmailSettings" component={GmailSettingsScreen} options={{ title: "Gmail 연동" }} />
    </Stack.Navigator>
  );
}

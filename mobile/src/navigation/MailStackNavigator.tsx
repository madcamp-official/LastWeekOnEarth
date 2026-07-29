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
      <Stack.Screen name="ComposeMail" component={ComposeMailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MailDraftDetail" component={MailDraftDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GmailSettings" component={GmailSettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

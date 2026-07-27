import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { ContactsListScreen } from "../screens/ContactsListScreen";
import { ContactDetailScreen } from "../screens/ContactDetailScreen";
import { AddContactScreen } from "../screens/AddContactScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ContactsList">
      <Stack.Screen name="ContactsList" component={ContactsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "인맥 상세" }} />
      <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "인맥 추가" }} />
    </Stack.Navigator>
  );
}

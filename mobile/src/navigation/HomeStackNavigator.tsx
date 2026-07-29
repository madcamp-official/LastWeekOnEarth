import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { ContactsListScreen } from "../screens/ContactsListScreen";
import { ContactDetailScreen } from "../screens/ContactDetailScreen";
import { AddContactScreen } from "../screens/AddContactScreen";
import { IncomingContactsScreen } from "../screens/IncomingContactsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ContactsList">
      <Stack.Screen name="ContactsList" component={ContactsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddContact" component={AddContactScreen} options={{ headerShown: false }} />
      <Stack.Screen name="IncomingContacts" component={IncomingContactsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

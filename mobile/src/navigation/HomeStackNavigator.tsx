import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { ContactsListScreen } from "../screens/ContactsListScreen";
import { ContactDetailScreen } from "../screens/ContactDetailScreen";
import { AddContactScreen } from "../screens/AddContactScreen";
import { BleTagScreen } from "../screens/BleTagScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="ContactsList">
      <Stack.Screen name="ContactsList" component={ContactsListScreen} options={{ title: "주소록" }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "인맥 상세" }} />
      <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "인맥 추가" }} />
      <Stack.Screen name="BleTag" component={BleTagScreen} options={{ title: "주변 기기 태깅" }} />
    </Stack.Navigator>
  );
}

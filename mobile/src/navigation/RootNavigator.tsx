import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./types";
import { useAuthStore } from "../store/useAuthStore";
import { DevLoginScreen } from "../screens/DevLoginScreen";
import { ContactsListScreen } from "../screens/ContactsListScreen";
import { ContactDetailScreen } from "../screens/ContactDetailScreen";
import { AddContactScreen } from "../screens/AddContactScreen";
import { BleTagScreen } from "../screens/BleTagScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  // 실제 로그인 기능이 완성되기 전까지는 accessToken 유무로 화면을 나눈다.
  // 로그인 기능이 들어오면 DevLoginScreen 분기를 실제 로그인 스택으로 교체한다.
  const accessToken = useAuthStore((s) => s.accessToken);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {accessToken ? (
          <>
            <Stack.Screen name="ContactsList" component={ContactsListScreen} options={{ title: "주소록" }} />
            <Stack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={{ title: "인맥 상세" }}
            />
            <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "인맥 추가" }} />
            <Stack.Screen name="BleTag" component={BleTagScreen} options={{ title: "주변 기기 태깅" }} />
          </>
        ) : (
          <Stack.Screen name="DevLogin" component={DevLoginScreen} options={{ title: "임시 로그인" }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

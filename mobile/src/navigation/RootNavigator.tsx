import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { HomeStackNavigator } from "./HomeStackNavigator";
import { GroupsStackNavigator } from "./GroupsStackNavigator";
import { MailStackNavigator } from "./MailStackNavigator";
import { PostStackNavigator } from "./PostStackNavigator";
import { MyPageScreen } from "../screens/MyPageScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Home: "📇",
  Groups: "👥",
  Mail: "✉️",
  Post: "✏️",
  MyPage: "👤",
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#111",
          tabBarInactiveTintColor: "#999",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: "인맥" }} />
        <Tab.Screen name="Groups" component={GroupsStackNavigator} options={{ title: "그룹" }} />
        <Tab.Screen name="Mail" component={MailStackNavigator} options={{ title: "메일" }} />
        <Tab.Screen name="Post" component={PostStackNavigator} options={{ title: "소식" }} />
        <Tab.Screen name="MyPage" component={MyPageScreen} options={{ title: "마이페이지" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

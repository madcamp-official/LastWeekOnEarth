import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { HomeStackNavigator } from "./HomeStackNavigator";
import { GroupsStackNavigator } from "./GroupsStackNavigator";
import { MailStackNavigator } from "./MailStackNavigator";
import { PostStackNavigator } from "./PostStackNavigator";
import { MyPageScreen } from "../screens/MyPageScreen";
import { BleTagScreen } from "../screens/BleTagScreen";
import { TabIcon, type TabIconName } from "../components/TabIcon";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

const TAB_ICON_NAMES: Record<string, TabIconName> = {
  Home: "contacts",
  Ble: "ble",
  Mail: "mail",
  Post: "post",
  MyPage: "mypage",
};

// Groups는 하단 탭에 노출하지 않고 ContactsListScreen 헤더의 그룹 아이콘에서
// navigation.navigate("Groups")로만 진입한다 — Anchora 디자인이 하단 탭을 4개로 유지하기 때문.
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.violet,
          tabBarInactiveTintColor: colors.faint,
          tabBarStyle: { borderTopColor: colors.line, height: 78, paddingTop: 8 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarIcon: () => <TabIcon name={TAB_ICON_NAMES[route.name]} active={false} />,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            title: "인맥",
            tabBarIcon: ({ focused }) => <TabIcon name="contacts" active={focused} />,
          }}
        />
        <Tab.Screen
          name="Ble"
          component={BleTagScreen}
          options={{
            title: "태깅",
            tabBarIcon: ({ focused }) => <TabIcon name="ble" active={focused} />,
          }}
        />
        <Tab.Screen
          name="Mail"
          component={MailStackNavigator}
          options={{
            title: "메일함",
            tabBarIcon: ({ focused }) => <TabIcon name="mail" active={focused} />,
          }}
        />
        <Tab.Screen
          name="Post"
          component={PostStackNavigator}
          options={{
            title: "소식",
            tabBarIcon: ({ focused }) => <TabIcon name="post" active={focused} />,
          }}
        />
        <Tab.Screen
          name="MyPage"
          component={MyPageScreen}
          options={{
            title: "마이",
            tabBarIcon: ({ focused }) => <TabIcon name="mypage" active={focused} />,
          }}
        />
        <Tab.Screen
          name="Groups"
          component={GroupsStackNavigator}
          options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

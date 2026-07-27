import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  // 탭바에 고정 height만 주면 iOS는 라이브러리가 하단 안전영역(홈 인디케이터)을 그 위에 자동으로
  // 더해줘서 자연스러워 보이지만, Android는 더해줄 안전영역이 거의 없어(제스처 내비 기준) 같은
  // height 안에서 아이콘+글자가 위쪽으로 몰리고 아래쪽만 비어 보였다. 콘텐츠 높이(56)에 실제
  // 하단 안전영역을 직접 더해서 두 플랫폼에서 동일하게 보이도록 한다.
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.violet,
          tabBarInactiveTintColor: colors.faint,
          tabBarStyle: {
            borderTopColor: colors.line,
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: insets.bottom,
          },
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

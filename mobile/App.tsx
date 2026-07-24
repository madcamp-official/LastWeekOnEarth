import React from "react";
import LoginScreen from "./src/screens/LoginScreen";
import { useAuthStore } from "./src/store/useAuthStore";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <LoginScreen />;
  }

  return <RootNavigator />;
}

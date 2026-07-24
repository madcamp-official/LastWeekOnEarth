import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact } from "../services/contactsApi";
import { useAuthStore } from "../store/useAuthStore";

type Props = NativeStackScreenProps<RootStackParamList, "ContactsList">;

export function ContactsListScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const clearAuth = useAuthStore((s) => s.clear);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setContacts(await contactsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Pressable style={styles.button} onPress={() => navigation.navigate("AddContact")}>
          <Text style={styles.buttonText}>+ 수동 등록</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate("BleTag")}>
          <Text style={styles.buttonText}>주변 기기로 태깅</Text>
        </Pressable>
      </View>
      <Pressable onPress={clearAuth}>
        <Text style={styles.switchUser}>다른 계정 토큰으로 전환 (개발용)</Text>
      </Pressable>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={styles.empty}>등록된 인맥이 없습니다.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate("ContactDetail", { contactId: item.id })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.affiliation ?? "-"} · {item.source === "BLE" ? "BLE" : "수동"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { flexDirection: "row", gap: 8, padding: 16 },
  button: { flex: 1, backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { color: "#666", marginTop: 2 },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
  switchUser: { textAlign: "center", color: "#999", marginBottom: 8, fontSize: 12 },
});

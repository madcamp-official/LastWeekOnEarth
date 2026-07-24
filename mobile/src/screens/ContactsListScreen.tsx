import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact } from "../services/contactsApi";

type Props = NativeStackScreenProps<RootStackParamList, "ContactsList">;

export function ContactsListScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.affiliation ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [contacts, query]);

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

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 소속, 이메일 검색"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <Text style={styles.empty}>{query ? "검색 결과가 없습니다." : "등록된 인맥이 없습니다."}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("ContactDetail", { contactId: item.id })}
          >
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>{item.name[0]}</Text>
            </View>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.affiliation ?? "-"}
            </Text>
            <Text style={styles.cardBadge}>{item.source === "BLE" ? "BLE" : "수동"}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actions: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 8 },
  button: { flex: 1, backgroundColor: "#111", borderRadius: 8, padding: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F2F2F2",
  },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, height: "100%" },
  list: { padding: 16, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    alignItems: "center",
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardAvatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  cardName: { fontWeight: "700", fontSize: 15 },
  cardMeta: { color: "#888", fontSize: 12, marginTop: 2 },
  cardBadge: { marginTop: 8, fontSize: 11, color: "#4285F4", fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});

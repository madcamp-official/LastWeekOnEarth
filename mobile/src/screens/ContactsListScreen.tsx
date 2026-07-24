import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { contactsApi, type Contact } from "../services/contactsApi";
import { confirmAction } from "../utils/confirm";

type Props = NativeStackScreenProps<RootStackParamList, "ContactsList">;

// 가나다 -> ABC 순: 한글 이름을 먼저, 그다음 영문 이름을 각각 로케일 정렬한다.
function compareByName(a: Contact, b: Contact): number {
  const aKorean = /^[가-힣]/.test(a.name);
  const bKorean = /^[가-힣]/.test(b.name);
  if (aKorean !== bKorean) return aKorean ? -1 : 1;
  return a.name.localeCompare(b.name, aKorean ? "ko" : "en");
}

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
    const base = q
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.affiliation ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q),
        )
      : contacts;
    return [...base].sort(compareByName);
  }, [contacts, query]);

  const handleDelete = (contact: Contact) => {
    confirmAction(`${contact.name}님을 삭제하시겠습니까?`, async () => {
      await contactsApi.remove(contact.id);
      load();
    });
  };

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
            <View style={styles.cardPhoto}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.cardPhotoImage} />
              ) : (
                <Text style={styles.cardPhotoText}>{item.name[0]}</Text>
              )}
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.affiliation ?? "-"}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.email ?? "-"}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.phone ?? "-"}
              </Text>
            </View>

            <Pressable style={styles.deleteButton} onPress={() => handleDelete(item)} hitSlop={8}>
              <Text style={styles.deleteButtonText}>🗑</Text>
            </Pressable>
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
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 8,
    // 세로 길이는 고정 비율 대신 사진 높이 + 여백만큼만 (콘텐츠 기준 auto height)
  },
  cardPhoto: {
    width: "28%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardPhotoImage: { width: "100%", height: "100%" },
  cardPhotoText: { color: "#fff", fontWeight: "700", fontSize: 22 },
  cardInfo: { flex: 1, marginLeft: 12, justifyContent: "center", gap: 2 },
  cardName: { fontWeight: "700", fontSize: 16 },
  cardMeta: { color: "#888", fontSize: 12 },
  deleteButton: { padding: 6, alignSelf: "flex-start" },
  deleteButtonText: { fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, color: "#999" },
});

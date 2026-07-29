import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * 화면이 포커스된 동안 callback을 즉시 한 번 실행하고, 이후 intervalMs마다 반복 실행한다.
 * 화면을 벗어나면(blur/unmount) 자동으로 멈춘다 — 웹소켓 없이 "새 쪽지/알림이 몇 초 안에 뜬다"는
 * 느낌을 주기 위한 폴링. 서버 부하를 고려해 각 화면에서 8~10초 정도의 간격을 쓴다.
 */
export function useFocusedInterval(callback: () => void, intervalMs: number) {
  useFocusEffect(
    useCallback(() => {
      callback();
      const id = setInterval(callback, intervalMs);
      return () => clearInterval(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMs]),
  );
}

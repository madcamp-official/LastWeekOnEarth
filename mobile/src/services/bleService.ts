import { BleManager } from "react-native-ble-plx";

// BLE 태깅 기능 구현 시 advertise/scan/RSSI 임계값 로직을 채운다 (CLAUDE.md 섹션 4).
export const bleManager = new BleManager();

export const BLE_RSSI_THRESHOLD = -50;

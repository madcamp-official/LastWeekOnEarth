// react-native-config(네이티브 빌드 시점 .env 주입)는 안 그래도 네이티브 셋업이 많은 이 프로젝트에서
// 굳이 필요한 리스크가 아니라고 판단해 뺐다. 기기에 따라 아래 값을 직접 바꿔서 쓴다:
//   - 실기기(iOS/Android 공통, 지금 쓰는 방식): 맥의 LAN IP. Wi-Fi 바뀌면 값이 바뀌니
//     `ipconfig getifaddr en0`로 다시 확인해서 갱신할 것.
//   - iOS 시뮬레이터로 바꿔 쓸 경우: "localhost"
//   - Android 에뮬레이터로 바꿔 쓸 경우: "10.0.2.2" (localhost 아님, 호스트 머신을 가리키는 특수 주소)
const DEV_HOST = "10.249.118.25";

export const API_BASE_URL = `http://${DEV_HOST}:4000/api`;

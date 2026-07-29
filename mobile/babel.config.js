module.exports = {
  presets: ["babel-preset-expo"],
  // react-native-reanimated의 워클릿 변환 플러그인은 반드시 플러그인 목록의 마지막에 와야 한다.
  plugins: ["react-native-reanimated/plugin"],
};

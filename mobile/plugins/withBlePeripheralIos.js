const { withXcodeProject, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// react-native-ble-peripheral의 iOS 소스에는 podspec이 없어 CocoaPods 자동링킹이 안 된다.
// expo prebuild가 ios 폴더를 매번 새로 생성하므로, 이 플러그인이 그때마다 소스 복사 +
// Xcode 프로젝트 등록을 대신 해준다.
const SOURCE_DIR = path.join(__dirname, "..", "node_modules", "react-native-ble-peripheral", "ios");
const GROUP_NAME = "BLEPeripheral";
const SOURCE_FILES = ["RNBLEPeripheral.swift", "RNBLEPeripheral.m"];
const BRIDGING_HEADER = "RNBLEPeripheral-Bridging-Header.h";

function withBlePeripheralCopyFiles(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const targetDir = path.join(config.modRequest.platformProjectRoot, GROUP_NAME);
      fs.mkdirSync(targetDir, { recursive: true });
      for (const file of [...SOURCE_FILES, BRIDGING_HEADER]) {
        fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(targetDir, file));
      }
      return config;
    },
  ]);
}

function withBlePeripheralXcodeProject(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;

    // 그룹 자체가 이미 path="BLEPeripheral"을 갖게 되므로, addPbxGroup에 파일 경로까지
    // "BLEPeripheral/RNBLEPeripheral.swift"로 같이 넘기면 그룹 경로와 파일 경로가 겹쳐서
    // 최종 경로가 "BLEPeripheral/BLEPeripheral/RNBLEPeripheral.swift"로 중복되는 버그가 있었다.
    // 빈 그룹만 만들고, 파일은 addSourceFile로 basename만 넘겨서 등록한다.
    const group = project.addPbxGroup([], GROUP_NAME, GROUP_NAME);

    const mainGroupId = project.getFirstProject().firstProject.mainGroup;
    project.addToPbxGroup(group.uuid, mainGroupId);

    // target을 명시하지 않으면 addSourceFile이 파일을 프로젝트 그룹에만 걸어두고 앱 타겟의
    // Sources 빌드 페이즈에는 등록하지 않아(내부적으로 addFile이 조용히 실패), 컴파일 자체가
    // 안 되는 상태로 "성공"처럼 보이는 빌드가 나왔다. target을 명시해야 실제로 컴파일된다.
    const target = project.getFirstTarget().uuid;
    for (const file of SOURCE_FILES) {
      project.addSourceFile(file, { target }, group.uuid);
    }

    project.addFramework("CoreBluetooth.framework", { link: true });

    // 이 프로젝트에 다른 Swift 브리징 헤더가 아직 없다는 전제로 값을 설정한다.
    // 다른 네이티브 모듈이 Swift 브리징 헤더를 추가로 요구하게 되면, 여기서 덮어쓰지 말고
    // 두 헤더의 import를 하나로 합쳐야 한다.
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (!buildSettings || !buildSettings.PRODUCT_NAME) continue;
      if (!buildSettings.SWIFT_OBJC_BRIDGING_HEADER) {
        buildSettings.SWIFT_OBJC_BRIDGING_HEADER = `"${GROUP_NAME}/${BRIDGING_HEADER}"`;
      }
      buildSettings.SWIFT_VERSION = buildSettings.SWIFT_VERSION || "5.0";
      buildSettings.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES = "YES";
    }

    return config;
  });
}

module.exports = function withBlePeripheralIos(config) {
  config = withBlePeripheralCopyFiles(config);
  config = withBlePeripheralXcodeProject(config);
  return config;
};

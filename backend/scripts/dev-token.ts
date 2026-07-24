import { PrismaClient } from "@prisma/client";
import { signAccessToken } from "../src/lib/jwt";

const prisma = new PrismaClient();

// auth 기능(로그인)이 아직 구현되지 않은 동안, 다른 기능을 로컬에서 테스트하기 위한 개발용 토큰 발급기.
// 사용법: npm run dev:token -- <username>  (먼저 npm run seed 로 테스트 유저를 만들어둘 것)
// BLE 코드는 여기서 만들지 않는다: 서버 프로세스 메모리에 저장되므로, 실행 중인 서버에
// POST /api/contacts/ble-token 을 이 accessToken으로 직접 호출해서 받아야 한다.
async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("사용법: npm run dev:token -- <username>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`유저를 찾을 수 없습니다: ${username} (먼저 npm run seed 를 실행하세요)`);
    process.exitCode = 1;
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, username: user.username });

  console.log(`userId: ${user.id}`);
  console.log(`accessToken: ${accessToken}`);
}

main().finally(() => prisma.$disconnect());

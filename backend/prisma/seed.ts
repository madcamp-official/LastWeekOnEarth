import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// 로그인/OTP 기능이 완성되기 전에도 다른 기능(주소록 등)을 로컬에서 테스트할 수 있도록
// 미리 검증된(emailVerified/phoneVerified=true) 테스트 유저를 심어둔다.
const testUsers = [
  { username: "alice", name: "김보경", affiliation: "몰입캠프", email: "alice@example.com", phone: "010-0000-0001" },
  { username: "bob", name: "이철수", affiliation: "몰입캠프", email: "bob@example.com", phone: "010-0000-0002" },
];

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: { ...user, passwordHash, emailVerified: true, phoneVerified: true },
    });
  }

  console.log(`Seeded users: ${testUsers.map((u) => u.username).join(", ")} (password: password123)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { prisma } from "./prisma";

/**
 * 신규 가입자의 이름이 처음 채워지는 시점(Google 가입 즉시, 또는 이메일 가입 후
 * 프로필 완성 화면 제출 시)에 자동으로 인사 소식을 하나 올려준다.
 */
export async function createWelcomePost(userId: string, name: string): Promise<void> {
  await prisma.post.create({
    data: {
      authorId: userId,
      content: `안녕하세요 ${name}입니다! 만나서 반가워요~`,
    },
  });
}

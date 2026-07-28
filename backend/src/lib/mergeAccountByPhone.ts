import { prisma } from "./prisma";

/**
 * 다른 이메일/구글 계정으로 가입했더라도 전화번호가 같으면 같은 사람으로 취급한다.
 * User.phone은 @unique라 그냥 update하면 그대로 409가 나던 상황을, 여기서는 두 계정을
 * 하나로 합쳐서 해결한다: 먼저 가입된 계정(primary)을 남기고, 나중 계정(secondary)의
 * 데이터(연락처/그룹/초안/소식 등)를 모두 primary로 옮긴 뒤 secondary는 삭제한다.
 *
 * 반환값이 있으면 병합이 일어난 것이고, 호출한 쪽(secondary였던 계정)의 세션은 더 이상
 * 유효하지 않으므로 반환된 primary user로 새 토큰을 발급해 응답해야 한다.
 */
export async function mergeAccountByPhone(
  currentUserId: string,
  phone: string,
): Promise<{ id: string; username: string } | null> {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (!existing || existing.id === currentUserId) return null;

  const current = await prisma.user.findUniqueOrThrow({ where: { id: currentUserId } });

  const [primary, secondary] = current.createdAt <= existing.createdAt ? [current, existing] : [existing, current];

  // 서로 다른 로그인 수단(비밀번호/구글)으로 각각 가입했을 수 있으니, primary에 없는 값은 secondary에서 채운다.
  await prisma.user.update({
    where: { id: primary.id },
    data: {
      phone,
      phoneVerified: primary.phoneVerified || secondary.phoneVerified,
      passwordHash: primary.passwordHash ?? secondary.passwordHash,
      googleId: primary.googleId ?? secondary.googleId,
      name: primary.name || secondary.name,
      affiliation: primary.affiliation || secondary.affiliation,
      avatarUrl: primary.avatarUrl ?? secondary.avatarUrl,
    },
  });

  // secondary.googleId는 User.googleId가 @unique라 primary로 옮기기 전엔 secondary에 남아있으면 안 된다.
  await prisma.user.update({ where: { id: secondary.id }, data: { googleId: null, phone: null } });

  // GmailAuthorization은 유저당 1개(@unique) — primary에 이미 있으면 secondary 것은 버린다.
  const secondaryGmailAuth = await prisma.gmailAuthorization.findUnique({ where: { userId: secondary.id } });
  if (secondaryGmailAuth) {
    const primaryHasGmailAuth = await prisma.gmailAuthorization.findUnique({ where: { userId: primary.id } });
    if (primaryHasGmailAuth) {
      await prisma.gmailAuthorization.delete({ where: { userId: secondary.id } });
    } else {
      await prisma.gmailAuthorization.update({ where: { userId: secondary.id }, data: { userId: primary.id } });
    }
  }

  // PostLike는 (postId, userId) 유니크 — 같은 소식에 두 계정이 모두 좋아요를 눌렀으면 중복이 생기니
  // secondary 쪽 중복만 지우고 나머지는 옮긴다.
  const secondaryLikes = await prisma.postLike.findMany({ where: { userId: secondary.id } });
  for (const like of secondaryLikes) {
    const alreadyLiked = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: like.postId, userId: primary.id } },
    });
    if (alreadyLiked) {
      await prisma.postLike.delete({ where: { id: like.id } });
    } else {
      await prisma.postLike.update({ where: { id: like.id }, data: { userId: primary.id } });
    }
  }

  await prisma.$transaction([
    prisma.contact.updateMany({ where: { ownerUserId: secondary.id }, data: { ownerUserId: primary.id } }),
    prisma.contact.updateMany({ where: { targetUserId: secondary.id }, data: { targetUserId: primary.id } }),
    prisma.contactGroup.updateMany({ where: { ownerUserId: secondary.id }, data: { ownerUserId: primary.id } }),
    prisma.cvEntry.updateMany({ where: { userId: secondary.id }, data: { userId: primary.id } }),
    prisma.emailDraft.updateMany({ where: { ownerUserId: secondary.id }, data: { ownerUserId: primary.id } }),
    prisma.emailBatch.updateMany({ where: { ownerUserId: secondary.id }, data: { ownerUserId: primary.id } }),
    prisma.notification.updateMany({ where: { userId: secondary.id }, data: { userId: primary.id } }),
    prisma.refreshToken.updateMany({ where: { userId: secondary.id }, data: { userId: primary.id } }),
    prisma.userEmail.updateMany({ where: { userId: secondary.id }, data: { userId: primary.id } }),
    prisma.post.updateMany({ where: { authorId: secondary.id }, data: { authorId: primary.id } }),
    prisma.postComment.updateMany({ where: { authorId: secondary.id }, data: { authorId: primary.id } }),
    prisma.phoneVerification.updateMany({ where: { userId: secondary.id }, data: { userId: primary.id } }),
  ]);

  await prisma.user.delete({ where: { id: secondary.id } });

  return prisma.user.findUniqueOrThrow({ where: { id: primary.id } });
}

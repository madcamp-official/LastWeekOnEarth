import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { verifyGoogleIdToken } from "../../lib/googleAuth";
import { issueTokens } from "../../lib/issueTokens";
import { generateUniqueUsername } from "../../lib/generateUniqueUsername";

/**
 * 구글 idToken 기반 로그인/가입.
 * 기존 유저는 googleId로 매칭, 없으면 email로 매칭해 연결, 둘 다 없으면 신규 가입.
 */
export async function googleLoginHandler(req: Request, res: Response) {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) {
    return res.status(400).json({ error: "idToken이 필요합니다." });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "유효하지 않은 Google idToken입니다." });
  }

  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: profile.googleId, emailVerified: profile.emailVerified || existingByEmail.emailVerified },
      });
    } else {
      const username = await generateUniqueUsername(profile.email.split("@")[0]);
      user = await prisma.user.create({
        data: {
          username,
          name: profile.name,
          affiliation: "",
          email: profile.email,
          emailVerified: profile.emailVerified,
          googleId: profile.googleId,
        },
      });
    }
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  return res.status(200).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      affiliation: user.affiliation,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
    },
  });
}

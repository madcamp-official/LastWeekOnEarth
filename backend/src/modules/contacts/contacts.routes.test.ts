import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { signAccessToken } from "../../lib/jwt";

// 실제 Postgres가 필요한 통합 테스트. backend/.env의 DATABASE_URL(또는 기본 폴백)에 접속해
// 이 테스트 전용으로 만든 유저/연락처만 생성하고 afterAll에서 정리한다.
describe("contacts routes", () => {
  const suffix = randomUUID().slice(0, 8);
  let ownerId: string;
  let targetId: string;
  let ownerToken: string;
  let targetToken: string;

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        username: `owner_${suffix}`,
        passwordHash: "x",
        name: "Owner",
        affiliation: "Test",
        email: `owner_${suffix}@example.com`,
        phone: `010-0000-${suffix.slice(0, 4)}`,
      },
    });
    const target = await prisma.user.create({
      data: {
        username: `target_${suffix}`,
        passwordHash: "x",
        name: "Target",
        affiliation: "Test",
        email: `target_${suffix}@example.com`,
        phone: `010-1111-${suffix.slice(0, 4)}`,
      },
    });

    ownerId = owner.id;
    targetId = target.id;
    ownerToken = signAccessToken({ userId: owner.id, username: owner.username });
    targetToken = signAccessToken({ userId: target.id, username: target.username });
  });

  afterAll(async () => {
    await prisma.contactLog.deleteMany({ where: { contact: { ownerUserId: { in: [ownerId, targetId] } } } });
    await prisma.contact.deleteMany({ where: { ownerUserId: { in: [ownerId, targetId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, targetId] } } });
    await prisma.$disconnect();
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/contacts");
    expect(res.status).toBe(401);
  });

  it("creates and lists a manual contact", async () => {
    const createRes = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "홍길동",
        affiliation: "OO회사",
        email: "hong@example.com",
        phone: "010-1234-5678",
        memo: "meetup",
        contactMethod: "KAKAO",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.source).toBe("MANUAL");
    expect(createRes.body.contactMethod).toBe("KAKAO");

    const listRes = await request(app).get("/api/contacts").set("Authorization", `Bearer ${ownerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((c: { id: string }) => c.id === createRes.body.id)).toBe(true);
  });

  it("prevents adding yourself as a manual contact", async () => {
    const byEmail = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Myself", email: `OWNER_${suffix}@EXAMPLE.COM` });

    expect(byEmail.status).toBe(400);
    expect(byEmail.body.error).toBe("자기 자신은 인맥으로 추가할 수 없습니다.");

    const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId } });
    const byPhone = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Myself", phone: owner.phone?.replace(/\D/g, "") });

    expect(byPhone.status).toBe(400);
    expect(byPhone.body.error).toBe("자기 자신은 인맥으로 추가할 수 없습니다.");
  });

  it("treats the connected Gmail address as the owner's identity", async () => {
    await prisma.gmailAuthorization.create({
      data: {
        userId: ownerId,
        refreshToken: "test-refresh-token",
        grantedEmail: "owner.gmail@gmail.com",
        scope: "gmail.send",
      },
    });

    const res = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "My Gmail", email: "owner.gmail+tag@googlemail.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("자기 자신은 인맥으로 추가할 수 없습니다.");
  });

  it("prevents duplicate contact emails, including Gmail aliases", async () => {
    const first = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "First Gmail Contact", email: "dupli.cate+first@gmail.com" });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Duplicate Gmail Contact", email: "duplicate@googlemail.com" });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("이미 인맥에 등록된 이메일입니다.");
  });

  it("updates an existing contact email", async () => {
    const createRes = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Editable Email", email: `before_${suffix}@example.com` });
    expect(createRes.status).toBe(201);

    const emailsRes = await request(app)
      .get(`/api/contacts/${createRes.body.id}/emails`)
      .set("Authorization", `Bearer ${ownerToken}`);
    const primaryEmail = emailsRes.body.find((item: { isPrimary: boolean }) => item.isPrimary);

    const updateRes = await request(app)
      .patch(`/api/contacts/${createRes.body.id}/emails/${primaryEmail.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: `after_${suffix}@example.com` });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.email).toBe(`after_${suffix}@example.com`);
    expect(updateRes.body.isPrimary).toBe(true);

    const contactRes = await request(app)
      .get(`/api/contacts/${createRes.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(contactRes.body.email).toBe(`after_${suffix}@example.com`);
  });

  it("prevents adding your own secondary email to a contact", async () => {
    const alias = `owner_alias_${suffix}@example.com`;
    await prisma.userEmail.create({
      data: { userId: ownerId, email: alias, isPrimary: false },
    });
    const contact = await prisma.contact.create({
      data: { ownerUserId: ownerId, name: "Other Person" },
    });

    const res = await request(app)
      .post(`/api/contacts/${contact.id}/emails`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: alias.toUpperCase() });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("자기 자신은 인맥으로 추가할 수 없습니다.");
  });

  it("prevents accessing another user's contact", async () => {
    const createRes = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "비공개" });

    const res = await request(app)
      .get(`/api/contacts/${createRes.body.id}`)
      .set("Authorization", `Bearer ${targetToken}`);
    expect(res.status).toBe(404);
  });

  it("updates and deletes a contact", async () => {
    const createRes = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "수정전" });

    const updateRes = await request(app)
      .patch(`/api/contacts/${createRes.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "수정후", contactMethod: "CALL" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe("수정후");
    expect(updateRes.body.contactMethod).toBe("CALL");

    const deleteRes = await request(app)
      .delete(`/api/contacts/${createRes.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/contacts/${createRes.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(getRes.status).toBe(404);
  });

  it("records a contact log and updates lastContactedAt", async () => {
    const createRes = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "로그대상" });

    const logRes = await request(app)
      .post(`/api/contacts/${createRes.body.id}/logs`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ channel: "EMAIL", memo: "안부 메일" });
    expect(logRes.status).toBe(201);

    const getRes = await request(app)
      .get(`/api/contacts/${createRes.body.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(getRes.body.lastContactedAt).not.toBeNull();
  });

  it("issues a BLE token and tags a contact from it, upserting on re-tag", async () => {
    const tokenRes = await request(app)
      .post("/api/contacts/ble-token")
      .set("Authorization", `Bearer ${targetToken}`);
    expect(tokenRes.status).toBe(200);
    const bleToken = tokenRes.body.token;

    const tagRes = await request(app)
      .post("/api/contacts/ble-tag")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ token: bleToken });
    expect(tagRes.status).toBe(201);
    expect(tagRes.body.source).toBe("BLE");
    expect(tagRes.body.name).toBe("Target");

    const retagRes = await request(app)
      .post("/api/contacts/ble-tag")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ token: bleToken });
    expect(retagRes.status).toBe(200);
    expect(retagRes.body.id).toBe(tagRes.body.id);
  });

  it("rejects BLE self-tagging", async () => {
    const tokenRes = await request(app)
      .post("/api/contacts/ble-token")
      .set("Authorization", `Bearer ${ownerToken}`);

    const res = await request(app)
      .post("/api/contacts/ble-tag")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ token: tokenRes.body.token });
    expect(res.status).toBe(400);
  });

  it("shows a linked user's latest profile photo in the owner's contacts", async () => {
    const contact = await prisma.contact.create({
      data: {
        ownerUserId: ownerId,
        targetUserId: targetId,
        name: "프로필 사진 대상",
        source: "BLE",
      },
    });
    const avatarUrl = "data:image/png;base64,dGVzdA==";

    const profileRes = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${targetToken}`)
      .send({ avatarUrl });
    expect(profileRes.status).toBe(200);

    const listRes = await request(app).get("/api/contacts").set("Authorization", `Bearer ${ownerToken}`);
    const listed = listRes.body.find((item: { id: string }) => item.id === contact.id);
    expect(listed.photoUrl).toBe(avatarUrl);

    const detailRes = await request(app)
      .get(`/api/contacts/${contact.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(detailRes.body.photoUrl).toBe(avatarUrl);
  });
});

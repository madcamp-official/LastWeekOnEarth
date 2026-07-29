import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { prisma } from "../../lib/prisma";
import { signAccessToken } from "../../lib/jwt";
import { sendGmailOnBehalfOfUser } from "../../lib/googleMailAuth";

jest.mock("../../lib/googleMailAuth", () => ({
  ...jest.requireActual("../../lib/googleMailAuth"),
  sendGmailOnBehalfOfUser: jest.fn(),
}));

const mockedSendGmail = jest.mocked(sendGmailOnBehalfOfUser);

describe("mail draft routes", () => {
  const suffix = randomUUID().slice(0, 8);
  let ownerId: string;
  let contactId: string;
  let draftId: string;
  let ownerToken: string;

  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        username: `mail_owner_${suffix}`,
        passwordHash: "x",
        name: "Mail Owner",
        affiliation: "Test",
        email: `mail_owner_${suffix}@example.com`,
      },
    });
    const contact = await prisma.contact.create({
      data: {
        ownerUserId: owner.id,
        name: "Recipient",
        affiliation: "Test Company",
        email: `recipient_${suffix}@example.com`,
      },
    });
    const draft = await prisma.emailDraft.create({
      data: {
        ownerUserId: owner.id,
        contactId: contact.id,
        subject: "Hello",
        body: "Test message",
        channel: "EMAIL",
        status: "DRAFT",
      },
    });

    ownerId = owner.id;
    contactId = contact.id;
    draftId = draft.id;
    ownerToken = signAccessToken({ userId: owner.id, username: owner.username });
  });

  afterAll(async () => {
    await prisma.contactLog.deleteMany({ where: { contactId } });
    await prisma.emailDraft.deleteMany({ where: { ownerUserId: ownerId } });
    await prisma.contact.deleteMany({ where: { id: contactId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  });

  it("returns the contact relation after sending", async () => {
    mockedSendGmail.mockResolvedValue({ messageId: "gmail-message-id" });

    const res = await request(app)
      .post(`/api/mail-drafts/${draftId}/send`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("SENT");
    expect(res.body.gmailMessageId).toBe("gmail-message-id");
    expect(res.body.contact).toMatchObject({
      id: contactId,
      name: "Recipient",
      affiliation: "Test Company",
    });
    expect(res.body.group).toBeNull();
  });
});

import nodemailer from "nodemailer";

// Gmail 계정의 앱 비밀번호(2단계 인증 켠 뒤 발급)로 SMTP 발송한다. 일반 로그인 비밀번호로는
// 동작하지 않는다 — Google이 "보안 수준이 낮은 앱" 접근을 막아뒀기 때문에 앱 비밀번호가 필요하다.
const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : null;

function verificationEmailHtml(code: string): string {
  return `
<div style="background:#EDEAF3;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(36,31,46,0.08);">
    <tr>
      <td style="background:linear-gradient(135deg,#8B5CF6,#5B8EF2,#EC6BB0);padding:32px 32px 28px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Anchora</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:4px;">스쳐 가는 만남을, 오래가는 인맥으로</div>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;text-align:center;">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#241F2E;">이메일 인증코드</p>
        <p style="margin:0 0 24px;font-size:13.5px;color:#726D7D;line-height:1.6;">
          아래 6자리 코드를 앱에 입력하면 가입이 완료돼요.<br />본인이 요청한 게 아니라면 이 메일은 무시하셔도 됩니다.
        </p>
        <div style="display:inline-block;padding:16px 28px;background:#EFE9FA;border-radius:14px;">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#8B5CF6;">${code}</span>
        </div>
        <p style="margin:24px 0 0;font-size:12px;color:#A6A2AC;">이 코드는 발송 시점부터 10분간 유효합니다.</p>
      </td>
    </tr>
  </table>
</div>`.trim();
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (!transporter) {
    // 앱 비밀번호가 아직 설정되지 않은 로컬 개발 환경 — 실제 발송 대신 콘솔에 코드를 남긴다.
    console.warn(`[mailer] GMAIL_USER/GMAIL_APP_PASSWORD 미설정 — ${to}로 보낼 인증코드: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `Anchora <${process.env.GMAIL_USER}>`,
    to,
    subject: "[Anchora] 이메일 인증코드가 도착했어요",
    text: `Anchora 이메일 인증코드: ${code}\n\n앱에 이 코드를 입력하면 가입이 완료돼요. 발송 시점부터 10분간 유효합니다.\n본인이 요청한 게 아니라면 이 메일은 무시하셔도 됩니다.`,
    html: verificationEmailHtml(code),
  });
}

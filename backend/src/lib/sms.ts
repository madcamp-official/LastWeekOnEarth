/**
 * SMS OTP 발송 클라이언트 스텁.
 * 실제 프로바이더(NHN Cloud / Twilio 등) 연동은 auth/OTP 기능 구현 시 채운다.
 * 개발 중에는 콘솔 로그로 mock 처리.
 */
export interface SmsClient {
  sendOtp(phone: string, otpCode: string): Promise<void>;
}

class MockSmsClient implements SmsClient {
  async sendOtp(phone: string, otpCode: string): Promise<void> {
    console.log(`[MockSmsClient] ${phone} 로 OTP 발송: ${otpCode}`);
  }
}

export const smsClient: SmsClient = new MockSmsClient();

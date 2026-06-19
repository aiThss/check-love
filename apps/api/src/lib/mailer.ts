import nodemailer from "nodemailer";
import { env, isProduction } from "../config/env";

export async function sendOtpMail(email: string, code: string, purpose: "register" | "login") {
  const subject =
    purpose === "register" ? "Ma xac thuc LoveCheck cua ban" : "Ma dang nhap LoveCheck cua ban";
  const from = env.MAIL_FROM ?? env.SMTP_USER ?? "LoveCheck <hello.couple@gmail.com>";

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    if (!isProduction) {
      console.info(`[dev otp] ${email}: ${code}`);
    }
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text: `Ma OTP cua ban la ${code}. Ma het han sau ${env.OTP_TTL_MINUTES} phut.`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;color:#050505;line-height:1.5">
        <h1 style="font-size:24px;margin:0 0 12px">LoveCheck</h1>
        <p>Ma OTP cua ban:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:6px;margin:16px 0;color:#ff3b7f">${code}</p>
        <p>Ma het han sau ${env.OTP_TTL_MINUTES} phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
      </div>
    `
  });

  return { sent: true };
}

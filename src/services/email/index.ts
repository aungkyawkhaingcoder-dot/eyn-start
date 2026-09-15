import { createError, OTP_EXPIRY_MINUTES, OTP_LENGTH } from "../../utils";
import { sendWithResend } from "./providers/resend";
import { EmailMessage } from "./types";

// Handler က provider အကြောင်းသိဖို့မလိုဘဲ ဒီ function ကိုပဲခေါ်မည်။
export async function sendVerificationEmail(email: string, otp: string | number): Promise<void> {
  const recipient = email.trim();
  const code = String(otp);
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient)) {
    throw createError("Invalid email address.", 400, "Error_InvalidEmail");
  }
  if (!new RegExp(`^[0-9]{${OTP_LENGTH}}$`).test(code)) {
    throw createError("Invalid verification code.", 400, "Error_InvalidOTP");
  }

  const provider = process.env.EMAIL_PROVIDER ?? "resend";
  const from = process.env.EMAIL_FROM?.trim();
  if (provider !== "resend" || !from || /[\r\n]/.test(from)) {
    throw createError("Email service is not configured.", 503, "Error_EmailConfiguration");
  }

  const message: EmailMessage = {
    from,
    to: recipient,
    subject: "Verify your email address",
    text: [
      `Your verification code is: ${code}`,
      `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      "Do not share this code with anyone.",
      "If you did not request this email, you can ignore it.",
    ].join("\n\n"),
  };

  // Provider ပြောင်းချင်ရင် ဒီ dispatch နဲ့ provider file ကို ပြောင်းနိုင်သည်။
  await sendWithResend(message);
}

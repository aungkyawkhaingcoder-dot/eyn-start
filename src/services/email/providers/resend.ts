import { Resend } from "resend";
import { createError } from "../../../utils";
import { EmailMessage } from "../types";

export async function sendWithResend(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw createError("Email service is not configured.", 503, "Error_EmailConfiguration");
  }

  const client = new Resend(apiKey);
  try {
    const { data, error } = await client.emails.send(message);
    // The SDK can resolve with an error instead of throwing.
    if (error || !data?.id) throw new Error("Email was not accepted");
  } catch {
    // Never forward provider errors: they may include addresses or request data.
    throw createError("Unable to send verification email. Please try again later.",
      503, "Error_EmailSendFailed");
  }
}

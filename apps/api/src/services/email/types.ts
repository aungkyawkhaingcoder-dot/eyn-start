// Provider-neutral message: a future SES sender can accept this same shape.
export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
}

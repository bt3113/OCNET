/**
 * Email provider abstraction. Delivery is attempted only when a provider is
 * configured with server-side secrets; otherwise sending fails closed so the
 * product never claims an email was delivered when it was not.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}
export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<void>;
}

class ResendProvider implements EmailProvider {
  name = "resend";
  constructor(private apiKey: string, private from: string) {}
  async send(message: EmailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Email provider rejected the message (${response.status})`);
  }
}

export function emailProvider(): EmailProvider | null {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  return apiKey && from ? new ResendProvider(apiKey, from) : null;
}

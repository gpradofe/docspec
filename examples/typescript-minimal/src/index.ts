import { DocModule, DocHidden } from "@docspec/ts";

/**
 * A minimal notification service that sends messages via email and SMS.
 *
 * This Tier 1 example demonstrates basic DocSpec annotations:
 * - @DocModule for grouping related functionality
 * - @DocHidden for excluding internal helpers from documentation
 */
@DocModule({
  id: "ts-minimal",
  name: "Notification Service",
  description: "Sends notifications via email and SMS channels"
})
export class NotificationService {
  private readonly defaultSender = "noreply@example.com";

  /**
   * Send a notification to the specified recipient.
   *
   * @param recipient - The email address or phone number to notify
   * @param message - The notification message body
   * @param channel - Delivery channel: "email" or "sms"
   * @returns A confirmation ID for the sent notification
   */
  send(recipient: string, message: string, channel: "email" | "sms" = "email"): string {
    const sanitized = this.sanitizeInput(message);
    const id = this.generateId();

    if (channel === "email") {
      return this.sendEmail(recipient, sanitized, id);
    }
    return this.sendSms(recipient, sanitized, id);
  }

  /**
   * Retrieve the delivery status of a previously sent notification.
   *
   * @param confirmationId - The confirmation ID returned from send()
   * @returns The current delivery status
   */
  getStatus(confirmationId: string): NotificationStatus {
    return { id: confirmationId, status: "delivered", timestamp: new Date() };
  }

  /**
   * List all available notification channels.
   *
   * @returns An array of supported channel identifiers
   */
  listChannels(): string[] {
    return ["email", "sms"];
  }

  @DocHidden()
  private sanitizeInput(input: string): string {
    return input.replace(/<[^>]*>/g, "").trim();
  }

  @DocHidden()
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  @DocHidden()
  private sendEmail(to: string, body: string, id: string): string {
    console.log(`[EMAIL] To: ${to}, Body: ${body}`);
    return id;
  }

  @DocHidden()
  private sendSms(to: string, body: string, id: string): string {
    console.log(`[SMS] To: ${to}, Body: ${body}`);
    return id;
  }
}

/** Delivery status of a notification. */
export interface NotificationStatus {
  id: string;
  status: "pending" | "delivered" | "failed";
  timestamp: Date;
}

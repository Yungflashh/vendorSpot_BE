/**
 * Queue emails to send with delays between them to avoid rate limits
 * @param emails Array of email functions to execute
 * @param delayBetweenEmails Delay in milliseconds between each email (default: 10000ms = 10 seconds)
 */
export declare const queueEmails: (emails: Array<() => Promise<void>>, delayBetweenEmails?: number) => Promise<void>;
/**
 * Send emails in background without blocking the response
 * @param emails Array of email functions to execute
 * @param delayBetweenEmails Delay in milliseconds between each email (default: 10000ms = 10 seconds)
 */
export declare const queueEmailsInBackground: (emails: Array<() => Promise<void>>, delayBetweenEmails?: number) => void;
//# sourceMappingURL=email-queue.d.ts.map
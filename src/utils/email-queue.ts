import { logger } from './logger';

interface QueuedEmail {
  emailFunction: () => Promise<void>;
  delay: number;
}

/**
 * Queue emails to send with delays between them to avoid rate limits
 * @param emails Array of email functions to execute
 * @param delayBetweenEmails Delay in milliseconds between each email (default: 10000ms = 10 seconds)
 */
export const queueEmails = async (
  emails: Array<() => Promise<void>>,
  delayBetweenEmails: number = 10000
): Promise<void> => {
  for (let i = 0; i < emails.length; i++) {
    try {
      // Send the email
      await emails[i]();
      
      // Add delay before next email (but not after the last one)
      if (i < emails.length - 1) {
        logger.info(`Waiting ${delayBetweenEmails}ms before sending next email...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
      }
    } catch (error) {
      logger.error(`Failed to send queued email ${i + 1}:`, error);
      // Continue with next emails even if one fails
    }
  }
};

/**
 * Send emails in background without blocking the response
 * @param emails Array of email functions to execute
 * @param delayBetweenEmails Delay in milliseconds between each email (default: 10000ms = 10 seconds)
 */
export const queueEmailsInBackground = (
  emails: Array<() => Promise<void>>,
  delayBetweenEmails: number = 50000
): void => {
  // Fire and forget - don't await
  queueEmails(emails, delayBetweenEmails).catch(error => {
    logger.error('Background email queue error:', error);
  });
};
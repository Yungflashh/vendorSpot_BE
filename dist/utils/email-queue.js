"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEmailsInBackground = exports.queueEmails = void 0;
const logger_1 = require("./logger");
/**
 * Queue emails to send with delays between them to avoid rate limits
 * @param emails Array of email functions to execute
 * @param delayBetweenEmails Delay in milliseconds between each email (default: 10000ms = 10 seconds)
 */
const queueEmails = async (emails, delayBetweenEmails = 10000) => {
    for (let i = 0; i < emails.length; i++) {
        try {
            // Send the email
            await emails[i]();
            // Add delay before next email (but not after the last one)
            if (i < emails.length - 1) {
                logger_1.logger.info(`Waiting ${delayBetweenEmails}ms before sending next email...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to send queued email ${i + 1}:`, error);
            // Continue with next emails even if one fails
        }
    }
};
exports.queueEmails = queueEmails;
/**
 * Send emails in background without blocking the response
 * @param emails Array of email functions to execute
 * @param delayBetweenEmails Delay in milliseconds between each email (default: 10000ms = 10 seconds)
 */
const queueEmailsInBackground = (emails, delayBetweenEmails = 50000) => {
    // Fire and forget - don't await
    (0, exports.queueEmails)(emails, delayBetweenEmails).catch(error => {
        logger_1.logger.error('Background email queue error:', error);
    });
};
exports.queueEmailsInBackground = queueEmailsInBackground;
//# sourceMappingURL=email-queue.js.map
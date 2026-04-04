const { Queue } = require('bullmq');
const { redis: connection } = require('../config/redis');
const logger = require('./logger');

const queueCapable = Boolean(
    connection
    && typeof connection.duplicate === 'function'
    && typeof connection.on === 'function'
);

// Create the unified Email Queue processor only when Redis supports BullMQ.
const emailQueue = queueCapable
    ? new Queue('EmailDeliveryQueue', {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: true,
            removeOnFail: false
        }
    })
    : null;

if (!queueCapable) {
    logger.warn('⚠️ Email queue disabled: Redis connection is not BullMQ-compatible. Falling back to direct email delivery.');
}

/**
 * Enqueues an email for asynchronous background delivery
 * @param {Object} mailOptions 
 */
const enqueueEmail = async (mailOptions) => {
    if (!emailQueue) return false;
    try {
        await emailQueue.add('sendEmail', mailOptions);
        logger.info(`📧 Email queued for delivery to: ${mailOptions.to}`);
        return true;
    } catch (err) {
        logger.error(`❌ Failed to queue email to ${mailOptions.to}:`, err);
        return false;
    }
};

module.exports = {
    emailQueue,
    enqueueEmail
};

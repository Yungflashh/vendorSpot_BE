import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';

const router = Router();

// All message routes require authentication
router.use(authenticate);

// Send a message
router.post('/send', asyncHandler(messageController.sendMessage.bind(messageController)));

// Get unread count (must be before /:conversationId to avoid conflict)
router.get('/unread-count', asyncHandler(messageController.getUnreadCount.bind(messageController)));

// Get user's conversations
router.get('/conversations', asyncHandler(messageController.getConversations.bind(messageController)));

// Start or get a conversation
router.post('/conversations/start', asyncHandler(messageController.startConversation.bind(messageController)));

// Get messages in a conversation
router.get('/conversations/:conversationId', asyncHandler(messageController.getMessages.bind(messageController)));

// Mark conversation messages as read
router.put('/conversations/:conversationId/read', asyncHandler(messageController.markAsRead.bind(messageController)));

// Delete a message
router.delete('/:messageId', asyncHandler(messageController.deleteMessage.bind(messageController)));

export default router;

// ============================================================
// ACCOUNT DELETION ROUTES
// File: routes/account-deletion.routes.ts
// ============================================================

import { Router } from 'express';
import { accountDeletionController } from '../controllers/account-deletion.controller';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// ============================================================
// USER ROUTES (Authenticated users)
// ============================================================

router.use(authenticate);

const requestDeletionValidation = [
  body('reason')
    .isIn([
      'privacy_concerns',
      'not_using_anymore',
      'found_alternative',
      'too_many_emails',
      'bad_experience',
      'technical_issues',
      'account_security',
      'other',
    ])
    .withMessage('Invalid deletion reason'),
  body('additionalDetails')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Additional details must be less than 1000 characters'),
];

/**
 * POST /api/v1/account-deletion/request
 * Request account deletion
 */
router.post(
  '/request',
  validate(requestDeletionValidation),
  asyncHandler(accountDeletionController.requestAccountDeletion.bind(accountDeletionController))
);

/**
 * GET /api/v1/account-deletion/status
 * Get deletion request status
 */
router.get(
  '/status',
  asyncHandler(accountDeletionController.getDeletionRequestStatus.bind(accountDeletionController))
);

/**
 * POST /api/v1/account-deletion/cancel
 * Cancel deletion request
 */
router.post(
  '/cancel',
  asyncHandler(accountDeletionController.cancelDeletionRequest.bind(accountDeletionController))
);

// ============================================================
// ADMIN ROUTES
// ============================================================

/**
 * GET /api/v1/account-deletion/admin/requests
 * Get all deletion requests (Admin only)
 * Query: ?page=1&limit=20&status=pending
 */
router.get(
  '/admin/requests',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(accountDeletionController.getAllDeletionRequests.bind(accountDeletionController))
);

/**
 * POST /api/v1/account-deletion/admin/approve/:requestId
 * Approve deletion request (Admin only)
 */
router.post(
  '/admin/approve/:requestId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(accountDeletionController.approveDeletionRequest.bind(accountDeletionController))
);

const rejectDeletionValidation = [
  body('rejectionReason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ max: 500 })
    .withMessage('Rejection reason must be less than 500 characters'),
];

/**
 * POST /api/v1/account-deletion/admin/reject/:requestId
 * Reject deletion request (Admin only)
 */
router.post(
  '/admin/reject/:requestId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validate(rejectDeletionValidation),
  asyncHandler(accountDeletionController.rejectDeletionRequest.bind(accountDeletionController))
);

export default router;
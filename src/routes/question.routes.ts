// routes/question.routes.ts
import { Router } from 'express';
import { questionController } from '../controllers/question.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/error';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

const askQuestionValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('question')
    .notEmpty()
    .withMessage('Question is required')
    .isLength({ max: 1000 })
    .withMessage('Question cannot exceed 1000 characters'),
];

const answerQuestionValidation = [
  body('answer')
    .notEmpty()
    .withMessage('Answer is required')
    .isLength({ max: 2000 })
    .withMessage('Answer cannot exceed 2000 characters'),
];

// Public routes
router.get(
  '/product/:productId',
  asyncHandler(questionController.getProductQuestions.bind(questionController))
);

// Authenticated routes
router.use(authenticate);

router.post(
  '/',
  validate(askQuestionValidation),
  asyncHandler(questionController.askQuestion.bind(questionController))
);

router.get(
  '/my-questions',
  asyncHandler(questionController.getMyQuestions.bind(questionController))
);

router.get(
  '/vendor-questions',
  asyncHandler(questionController.getVendorQuestions.bind(questionController))
);

router.put(
  '/:questionId',
  body('question').notEmpty().withMessage('Question is required'),
  asyncHandler(questionController.updateQuestion.bind(questionController))
);

router.delete(
  '/:questionId',
  asyncHandler(questionController.deleteQuestion.bind(questionController))
);

router.put(
  '/:questionId/answer',
  validate(answerQuestionValidation),
  asyncHandler(questionController.answerQuestion.bind(questionController))
);

router.post(
  '/:questionId/helpful',
  asyncHandler(questionController.markHelpful.bind(questionController))
);

router.post(
  '/:questionId/report',
  body('reason').notEmpty().withMessage('Report reason is required'),
  asyncHandler(questionController.reportQuestion.bind(questionController))
);

export default router;
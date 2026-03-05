"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/address.routes.ts
const express_1 = require("express");
const address_controller_1 = require("../controllers/address.controller");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const express_validator_1 = require("express-validator");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All address routes require authentication
router.use(auth_1.authenticate);
const createAddressValidation = [
    (0, express_validator_1.body)('fullName').notEmpty().withMessage('Full name is required'),
    (0, express_validator_1.body)('phone').notEmpty().withMessage('Phone number is required'),
    (0, express_validator_1.body)('street').notEmpty().withMessage('Street address is required'),
    (0, express_validator_1.body)('city').notEmpty().withMessage('City is required'),
    (0, express_validator_1.body)('state').notEmpty().withMessage('State is required'),
    (0, express_validator_1.body)('label').optional().isIn(['Home', 'Office', 'Other']).withMessage('Invalid label'),
];
const updateAddressValidation = [
    (0, express_validator_1.body)('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
    (0, express_validator_1.body)('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
    (0, express_validator_1.body)('street').optional().notEmpty().withMessage('Street cannot be empty'),
    (0, express_validator_1.body)('city').optional().notEmpty().withMessage('City cannot be empty'),
    (0, express_validator_1.body)('state').optional().notEmpty().withMessage('State cannot be empty'),
    (0, express_validator_1.body)('label').optional().isIn(['Home', 'Office', 'Other']).withMessage('Invalid label'),
    (0, express_validator_1.body)('revalidate').optional().isBoolean().withMessage('Revalidate must be boolean'),
];
const validateAddressValidation = [
    (0, express_validator_1.body)('fullName').notEmpty().withMessage('Full name is required'),
    (0, express_validator_1.body)('phone').notEmpty().withMessage('Phone number is required'),
    (0, express_validator_1.body)('street').notEmpty().withMessage('Street address is required'),
    (0, express_validator_1.body)('city').notEmpty().withMessage('City is required'),
    (0, express_validator_1.body)('state').notEmpty().withMessage('State is required'),
];
// Get all addresses
router.get('/', (0, error_1.asyncHandler)(address_controller_1.addressController.getAddresses.bind(address_controller_1.addressController)));
// Validate address (without saving)
router.post('/validate', (0, validation_1.validate)(validateAddressValidation), (0, error_1.asyncHandler)(address_controller_1.addressController.validateAddress.bind(address_controller_1.addressController)));
// Get single address
router.get('/:id', (0, error_1.asyncHandler)(address_controller_1.addressController.getAddress.bind(address_controller_1.addressController)));
// Create new address
router.post('/', (0, validation_1.validate)(createAddressValidation), (0, error_1.asyncHandler)(address_controller_1.addressController.createAddress.bind(address_controller_1.addressController)));
// Update address
router.put('/:id', (0, validation_1.validate)(updateAddressValidation), (0, error_1.asyncHandler)(address_controller_1.addressController.updateAddress.bind(address_controller_1.addressController)));
// Delete address
router.delete('/:id', (0, error_1.asyncHandler)(address_controller_1.addressController.deleteAddress.bind(address_controller_1.addressController)));
// Set default address
router.patch('/:id/default', (0, error_1.asyncHandler)(address_controller_1.addressController.setDefaultAddress.bind(address_controller_1.addressController)));
exports.default = router;
//# sourceMappingURL=address.routes.js.map
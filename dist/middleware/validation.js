"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const express_validator_1 = require("express-validator");
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        const extractedErrors = [];
        errors.array().forEach((err) => {
            extractedErrors.push({ [err.path]: err.msg });
        });
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            error: JSON.stringify(extractedErrors),
        });
    };
};
exports.validate = validate;
//# sourceMappingURL=validation.js.map
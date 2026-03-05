"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paystackService = exports.PaystackService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';
class PaystackService {
    constructor() {
        this.headers = {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
        };
    }
    /**
     * Initialize payment transaction
     */
    async initializePayment(data) {
        try {
            const response = await axios_1.default.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, data, { headers: this.headers });
            logger_1.logger.info('Paystack payment initialized:', data.reference);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Paystack initialization error:', error.response?.data || error.message);
            throw new Error('Failed to initialize payment');
        }
    }
    /**
     * Verify payment transaction
     */
    async verifyPayment(reference) {
        try {
            const response = await axios_1.default.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, { headers: this.headers });
            logger_1.logger.info('Paystack payment verified:', reference);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Paystack verification error:', error.response?.data || error.message);
            throw new Error('Failed to verify payment');
        }
    }
    /**
     * Create transfer recipient
     */
    async createTransferRecipient(data) {
        try {
            const response = await axios_1.default.post(`${PAYSTACK_BASE_URL}/transferrecipient`, data, { headers: this.headers });
            logger_1.logger.info('Transfer recipient created:', data.account_number);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Create recipient error:', error.response?.data || error.message);
            throw new Error('Failed to create transfer recipient');
        }
    }
    /**
     * Initiate transfer
     */
    async initiateTransfer(data) {
        try {
            const response = await axios_1.default.post(`${PAYSTACK_BASE_URL}/transfer`, data, { headers: this.headers });
            logger_1.logger.info('Transfer initiated:', data.reference);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Transfer error:', error.response?.data || error.message);
            throw new Error('Failed to initiate transfer');
        }
    }
    /**
     * Resolve bank account
     */
    async resolveBankAccount(accountNumber, bankCode) {
        try {
            const response = await axios_1.default.get(`${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, { headers: this.headers });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Account resolution error:', error.response?.data || error.message);
            throw new Error('Failed to resolve bank account');
        }
    }
    /**
     * Get list of banks
     */
    async getBanks() {
        try {
            const response = await axios_1.default.get(`${PAYSTACK_BASE_URL}/bank`, { headers: this.headers });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Get banks error:', error.response?.data || error.message);
            throw new Error('Failed to get banks');
        }
    }
}
exports.PaystackService = PaystackService;
exports.paystackService = new PaystackService();
//# sourceMappingURL=paystack.service.js.map
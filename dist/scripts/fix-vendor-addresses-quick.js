"use strict";
// scripts/fix-vendor-addresses-quick.ts
/**
 * QUICK FIX: Update existing vendor addresses in MongoDB
 * Run this to fix vendor addresses WITHOUT reseeding the entire database
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const VendorProfile_1 = __importDefault(require("../models/VendorProfile"));
const logger_1 = require("../utils/logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const realVendorAddresses = [
    {
        businessName: "Jane's Electronics Hub",
        address: {
            street: '15 Akerele Street, Surulere',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            zipCode: '101283',
        },
        phone: '+234 803 456 7890',
    },
    {
        businessName: 'Fashion Forward by Sarah',
        address: {
            street: '42 Allen Avenue, Ikeja',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            zipCode: '100271',
        },
        phone: '+234 805 123 4567',
    },
    {
        businessName: "David's Home Store",
        address: {
            street: '8 Isaac John Street, GRA Ikeja',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            zipCode: '100251',
        },
        phone: '+234 807 890 1234',
    },
    {
        businessName: "Emma's Digital Academy",
        address: {
            street: '23 Admiralty Way, Lekki Phase 1',
            city: 'Lagos',
            state: 'Lagos',
            country: 'Nigeria',
            zipCode: '101245',
        },
        phone: '+234 809 567 8901',
    },
];
async function fixVendorAddresses() {
    try {
        logger_1.logger.info('🔧 Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        logger_1.logger.info('✅ Connected to MongoDB');
        logger_1.logger.info('\n🏪 Updating vendor addresses...');
        let updated = 0;
        let notFound = 0;
        for (const vendorData of realVendorAddresses) {
            const profile = await VendorProfile_1.default.findOne({
                businessName: vendorData.businessName
            });
            if (profile) {
                profile.businessAddress = vendorData.address;
                profile.businessPhone = vendorData.phone;
                await profile.save();
                logger_1.logger.info(`✅ Updated: ${vendorData.businessName}`);
                logger_1.logger.info(`   Address: ${vendorData.address.street}, ${vendorData.address.city}`);
                updated++;
            }
            else {
                logger_1.logger.warn(`⚠️  Not found: ${vendorData.businessName}`);
                notFound++;
            }
        }
        logger_1.logger.info('\n📊 Summary:');
        logger_1.logger.info(`   ✅ Updated: ${updated} vendors`);
        logger_1.logger.info(`   ⚠️  Not found: ${notFound} vendors`);
        if (updated > 0) {
            logger_1.logger.info('\n🎉 Vendor addresses have been updated!');
            logger_1.logger.info('✅ ShipBubble will now accept these addresses');
            logger_1.logger.info('✅ Your checkout should work without errors');
        }
        await mongoose_1.default.disconnect();
        logger_1.logger.info('\n✅ Done! MongoDB disconnected.');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('❌ Error fixing vendor addresses:', error.message);
        process.exit(1);
    }
}
// Run the fix
fixVendorAddresses();
/**
 * HOW TO USE:
 *
 * 1. Save this file as: scripts/fix-vendor-addresses-quick.ts
 *
 * 2. Add to package.json scripts (optional):
 *    "fix-vendors": "ts-node scripts/fix-vendor-addresses-quick.ts"
 *
 * 3. Run it:
 *    npm run fix-vendors
 *
 *    OR directly:
 *    npx ts-node scripts/fix-vendor-addresses-quick.ts
 *
 * 4. Restart your backend:
 *    npm run dev
 *
 * 5. Test checkout - it should work now!
 */ 
//# sourceMappingURL=fix-vendor-addresses-quick.js.map
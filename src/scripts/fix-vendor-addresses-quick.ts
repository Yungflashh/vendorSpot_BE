// scripts/fix-vendor-addresses-quick.ts
/**
 * QUICK FIX: Update existing vendor addresses in MongoDB
 * Run this to fix vendor addresses WITHOUT reseeding the entire database
 */

import mongoose from 'mongoose';
import VendorProfile from '../models/VendorProfile';
import User from '../models/User';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

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
    logger.info('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info('✅ Connected to MongoDB');

    logger.info('\n🏪 Updating vendor addresses...');

    let updated = 0;
    let notFound = 0;

    for (const vendorData of realVendorAddresses) {
      const profile = await VendorProfile.findOne({ 
        businessName: vendorData.businessName 
      });

      if (profile) {
        profile.businessAddress = vendorData.address;
        profile.businessPhone = vendorData.phone;
        await profile.save();

        logger.info(`✅ Updated: ${vendorData.businessName}`);
        logger.info(`   Address: ${vendorData.address.street}, ${vendorData.address.city}`);
        updated++;
      } else {
        logger.warn(`⚠️  Not found: ${vendorData.businessName}`);
        notFound++;
      }
    }

    logger.info('\n📊 Summary:');
    logger.info(`   ✅ Updated: ${updated} vendors`);
    logger.info(`   ⚠️  Not found: ${notFound} vendors`);

    if (updated > 0) {
      logger.info('\n🎉 Vendor addresses have been updated!');
      logger.info('✅ ShipBubble will now accept these addresses');
      logger.info('✅ Your checkout should work without errors');
    }

    await mongoose.disconnect();
    logger.info('\n✅ Done! MongoDB disconnected.');
    process.exit(0);

  } catch (error: any) {
    logger.error('❌ Error fixing vendor addresses:', error.message);
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
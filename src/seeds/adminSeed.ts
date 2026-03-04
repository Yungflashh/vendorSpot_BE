import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { connectDB } from '../config/database';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const admins = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@vendorspot.com',
    password: 'SuperAdmin@2026!',
    role: 'super_admin',
    emailVerified: true,
    status: 'active',
  },
  {
    firstName: 'Regular',
    lastName: 'Admin',
    email: 'admin@vendorspot.com',
    password: 'Admin@2026!',
    role: 'admin',
    emailVerified: true,
    status: 'active',
  },
  {
    firstName: 'Finance',
    lastName: 'Admin',
    email: 'finance@vendorspot.com',
    password: 'Finance@2026!',
    role: 'financial_admin',
    emailVerified: true,
    status: 'active',
  },
];

async function seedAdmins() {
  try {
    await connectDB();
    logger.info('Connected to database');

    for (const admin of admins) {
      const existing = await User.findOne({ email: admin.email });

      if (existing) {
        // Update existing user to admin role
        existing.role = admin.role as any;
        existing.status = 'active' as any;
        existing.emailVerified = true;
        await existing.save();
        logger.info(`Updated existing user: ${admin.email} → ${admin.role}`);
      } else {
        // Create new admin user (password gets hashed by pre-save hook)
        await User.create(admin);
        logger.info(`Created: ${admin.email} (${admin.role})`);
      }
    }

    console.log('\n========================================');
    console.log('  Admin accounts seeded successfully!');
    console.log('========================================\n');
    console.log('  Super Admin:');
    console.log('    Email:    superadmin@vendorspot.com');
    console.log('    Password: SuperAdmin@2026!\n');
    console.log('  Admin:');
    console.log('    Email:    admin@vendorspot.com');
    console.log('    Password: Admin@2026!\n');
    console.log('  Financial Admin:');
    console.log('    Email:    finance@vendorspot.com');
    console.log('    Password: Finance@2026!\n');
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdmins();

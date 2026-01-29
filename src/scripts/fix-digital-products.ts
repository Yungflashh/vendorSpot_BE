// scripts/fix-digital-products.ts
// Run this script to add digitalFile field to all digital products

import mongoose from 'mongoose';
import Product from '../models/Product';
import { connectDB } from '../config/database';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const digitalFileData: { [key: string]: any } = {
  'Premium UI/UX Design Course': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/ui-ux-design-course.zip',
    fileName: 'premium-ui-ux-design-course.zip',
    fileSize: 2147483648, // 2GB
    fileType: 'zip',
    version: '1.0',
  },
  'Full-Stack Web Development Bootcamp': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/fullstack-bootcamp.zip',
    fileName: 'fullstack-web-development-bootcamp.zip',
    fileSize: 2147483648, // 2GB
    fileType: 'zip',
    version: '2.0',
  },
  'Python for Data Science': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/python-data-science.zip',
    fileName: 'python-for-data-science.zip',
    fileSize: 1610612736, // 1.5GB
    fileType: 'zip',
    version: '1.0',
  },
  'Digital Marketing Masterclass': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/digital-marketing.zip',
    fileName: 'digital-marketing-masterclass.zip',
    fileSize: 1073741824, // 1GB
    fileType: 'zip',
    version: '1.0',
  },
  'Mobile App Development with React Native': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/react-native-course.zip',
    fileName: 'react-native-mobile-development.zip',
    fileSize: 1879048192, // 1.75GB
    fileType: 'zip',
    version: '1.0',
  },
  'Graphic Design Fundamentals': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/graphic-design.zip',
    fileName: 'graphic-design-fundamentals.zip',
    fileSize: 1610612736, // 1.5GB
    fileType: 'zip',
    version: '1.0',
  },
  'Excel Advanced Techniques': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/excel-advanced.zip',
    fileName: 'excel-advanced-techniques.zip',
    fileSize: 524288000, // 500MB
    fileType: 'zip',
    version: '1.0',
  },
  'Photography Masterclass': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/photography-masterclass.zip',
    fileName: 'photography-masterclass.zip',
    fileSize: 2147483648, // 2GB
    fileType: 'zip',
    version: '1.0',
  },
  'Video Editing with Premiere Pro': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/video-editing-premiere.zip',
    fileName: 'video-editing-premiere-pro.zip',
    fileSize: 2147483648, // 2GB
    fileType: 'zip',
    version: '1.0',
  },
  'Business Plan Templates Pack': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/business-plan-templates.zip',
    fileName: 'business-plan-templates-pack.zip',
    fileSize: 52428800, // 50MB
    fileType: 'zip',
    version: '1.0',
  },
  'Financial Literacy E-Book': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/financial-literacy-ebook.pdf',
    fileName: 'financial-literacy-guide.pdf',
    fileSize: 10485760, // 10MB
    fileType: 'pdf',
    version: '1.0',
  },
  'Stock Photo Bundle - Business': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/business-stock-photos.zip',
    fileName: 'business-stock-photo-bundle.zip',
    fileSize: 1073741824, // 1GB
    fileType: 'zip',
    version: '1.0',
  },
  'Resume Templates Collection': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/resume-templates.zip',
    fileName: 'resume-templates-collection.zip',
    fileSize: 20971520, // 20MB
    fileType: 'zip',
    version: '1.0',
  },
  'Social Media Graphics Pack': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/social-media-graphics.zip',
    fileName: 'social-media-graphics-pack.zip',
    fileSize: 524288000, // 500MB
    fileType: 'zip',
    version: '1.0',
  },
  'Meditation Audio Collection': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/meditation-audio.zip',
    fileName: 'meditation-audio-collection.zip',
    fileSize: 524288000, // 500MB
    fileType: 'zip',
    version: '1.0',
  },
  'Logo Design Templates': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/logo-templates.zip',
    fileName: 'logo-design-templates.zip',
    fileSize: 104857600, // 100MB
    fileType: 'zip',
    version: '1.0',
  },
  'Website Landing Page Templates': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/landing-page-templates.zip',
    fileName: 'website-landing-page-templates.zip',
    fileSize: 157286400, // 150MB
    fileType: 'zip',
    version: '1.0',
  },
  'Productivity Planner Digital': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/digital-planner.pdf',
    fileName: 'productivity-planner-digital.pdf',
    fileSize: 52428800, // 50MB
    fileType: 'pdf',
    version: '1.0',
  },
  'Music Production Course': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/music-production-course.zip',
    fileName: 'music-production-course.zip',
    fileSize: 2147483648, // 2GB
    fileType: 'zip',
    version: '1.0',
  },
  'Fitness Workout Programs': {
    url: 'https://vendorspot-downloads.s3.amazonaws.com/fitness-workout-programs.zip',
    fileName: 'fitness-workout-programs.zip',
    fileSize: 1073741824, // 1GB
    fileType: 'zip',
    version: '1.0',
  },
};

async function fixDigitalProducts() {
  try {
    logger.info('🔧 Starting digital products fix...');

    // Connect to database
    await connectDB();

    // Find all digital products
    const digitalProducts = await Product.find({ 
      productType: { $in: ['digital', 'service'] } 
    });

    logger.info(`📦 Found ${digitalProducts.length} digital products`);

    let updated = 0;
    let skipped = 0;

    for (const product of digitalProducts) {
      const digitalFileInfo = digitalFileData[product.name];

      if (!digitalFileInfo) {
        logger.warn(`⚠️  No digitalFile data for: ${product.name}`);
        skipped++;
        continue;
      }

      // Update product with digitalFile
      product.digitalFile = digitalFileInfo;
      await product.save();

      logger.info(`✅ Updated: ${product.name}`);
      updated++;
    }

    logger.info('\n✨ Fix completed!');
    logger.info(`   ✅ Updated: ${updated} products`);
    logger.info(`   ⚠️  Skipped: ${skipped} products`);

    if (updated > 0) {
      logger.info('\n🎉 All digital products now have download information!');
      logger.info('   - Download URL: ✅');
      logger.info('   - File Name: ✅');
      logger.info('   - File Size: ✅');
      logger.info('   - File Type: ✅');
      logger.info('   - Version: ✅');
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error fixing digital products:', error);
    process.exit(1);
  }
}

// Run the fix
fixDigitalProducts();
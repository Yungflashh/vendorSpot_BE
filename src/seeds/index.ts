import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Product from '../models/Product';
import Category from '../models/Category';
import VendorProfile from '../models/VendorProfile';
import { Coupon } from '../models/Additional';
import { connectDB } from '../config/database';
import { logger } from '../utils/logger';
import dotenv from "dotenv";

dotenv.config();

// Sample data
const categories = [
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and gadgets',
    icon: '📱',
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Clothing and accessories',
    icon: '👔',
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Home decor and furniture',
    icon: '🏠',
  },
  {
    name: 'Books',
    slug: 'books',
    description: 'Books and educational materials',
    icon: '📚',
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Sports equipment and accessories',
    icon: '⚽',
  },
  {
    name: 'Digital Products',
    slug: 'digital-products',
    description: 'Courses, e-books, software and digital downloads',
    icon: '💾',
  },
];

const users = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'admin@vendorspot.com',
    password: 'Admin123!',
    role: 'admin',
    emailVerified: true,
    status: 'active'
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'vendor@vendorspot.com',
    password: 'Vendor123!',
    role: 'vendor',
    emailVerified: true,
    status: 'active'
  },
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'customer@vendorspot.com',
    password: 'Customer123!',
    role: 'customer',
    emailVerified: true,
    status: 'active'
  },
  {
    firstName: 'Sarah',
    lastName: 'Williams',
    email: 'vendor2@vendorspot.com',
    password: 'Vendor123!',
    role: 'vendor',
    emailVerified: true,
    status: 'active'
  },
  {
    firstName: 'David',
    lastName: 'Brown',
    email: 'vendor3@vendorspot.com',
    password: 'Vendor123!',
    role: 'vendor',
    emailVerified: true,
    status: 'active'
  },
  {
    firstName: 'Emma',
    lastName: 'Davis',
    email: 'vendor4@vendorspot.com',
    password: 'Vendor123!',
    role: 'vendor',
    emailVerified: true,
    status: 'active'
  },
];

// Vendor profiles with ratings
const vendorProfiles = [
  {
    businessName: "Jane's Electronics Hub",
    businessDescription: 'Premium electronics and gadgets with warranty',
    businessLogo: 'https://picsum.photos/id/64/200/200',
    averageRating: 4.9,
    totalReviews: 500,
    totalSales: 1250,
    isActive: true,
    verificationStatus: 'verified',
  },
  {
    businessName: 'Fashion Forward by Sarah',
    businessDescription: 'Trendy fashion and accessories for everyone',
    businessLogo: 'https://picsum.photos/id/65/200/200',
    averageRating: 4.8,
    totalReviews: 380,
    totalSales: 890,
    isActive: true,
    verificationStatus: 'verified',
  },
  {
    businessName: "David's Home Store",
    businessDescription: 'Quality furniture and home decor',
    businessLogo: 'https://picsum.photos/id/66/200/200',
    averageRating: 4.7,
    totalReviews: 250,
    totalSales: 420,
    isActive: true,
    verificationStatus: 'verified',
  },
  {
    businessName: "Emma's Digital Academy",
    businessDescription: 'Professional courses and e-learning materials',
    businessLogo: 'https://picsum.photos/id/67/200/200',
    averageRating: 4.9,
    totalReviews: 620,
    totalSales: 1850,
    isActive: true,
    verificationStatus: 'verified',
  },
];

// 20 Physical Products with keyFeatures and specifications
const physicalProducts = [
  {
    name: 'iPhone 15 Pro Max',
    description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system. Experience the pinnacle of smartphone technology with ProMotion display, advanced computational photography, and all-day battery life.',
    shortDescription: 'Latest iPhone with A17 Pro chip and titanium design',
    price: 1200000,
    compareAtPrice: 1500000,
    quantity: 50,
    averageRating: 4.8,
    totalReviews: 120,
    totalSales: 95,
    views: 2500,
    lowStockThreshold: 10,
    sku: 'IPH15PM-256-BLK',
    images: ['https://picsum.photos/id/180/800/800'],
    tags: ['smartphone', 'apple', 'iphone', 'flagship'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.221,
    keyFeatures: [
      'A17 Pro chip with 6-core GPU for ultimate performance',
      'Titanium design with textured matte glass back',
      'ProMotion display with 120Hz adaptive refresh rate',
      '48MP Main camera with 5x Telephoto zoom',
      'All-day battery life with fast charging support'
    ],
    specifications: {
      'Display': '6.7-inch Super Retina XDR',
      'Processor': 'A17 Pro chip with 6-core CPU',
      'Camera': '48MP Main + 12MP Ultra Wide + 12MP Telephoto',
      'Storage': '256GB',
      'Battery': 'Up to 29 hours video playback',
      'Connectivity': '5G, WiFi 6E, Bluetooth 5.3',
      'Color': 'Natural Titanium',
      'Weight': '221g',
      'Warranty': '1 Year Apple Limited Warranty'
    }
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Premium Android flagship with S Pen, 200MP camera, and AI features. The ultimate productivity and creativity tool with Galaxy AI built-in for enhanced photo editing, note-taking, and more.',
    shortDescription: 'Premium Android flagship with S Pen and 200MP camera',
    price: 1100000,
    compareAtPrice: 1400000,
    quantity: 30,
    averageRating: 4.7,
    totalReviews: 95,
    totalSales: 78,
    views: 2100,
    lowStockThreshold: 5,
    sku: 'SGS24U-512-TIT',
    images: ['https://picsum.photos/id/119/800/800'],
    tags: ['smartphone', 'samsung', 'android', 'flagship'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.232,
    keyFeatures: [
      '200MP camera with AI photo editing capabilities',
      'Integrated S Pen for precision and creativity',
      'Qualcomm Snapdragon 8 Gen 3 processor',
      'All-day intelligent battery with 45W fast charging',
      'Galaxy AI features for productivity and creativity'
    ],
    specifications: {
      'Display': '6.8-inch Dynamic AMOLED 2X, 120Hz',
      'Processor': 'Snapdragon 8 Gen 3',
      'Camera': '200MP Main + 12MP Ultra Wide + 50MP Telephoto',
      'Storage': '512GB',
      'RAM': '12GB',
      'Battery': '5000mAh with 45W fast charging',
      'S Pen': 'Included with Bluetooth support',
      'Weight': '232g',
      'Warranty': '1 Year Manufacturer Warranty'
    }
  },
  {
    name: 'MacBook Pro 16" M3 Max',
    description: 'Professional laptop with M3 Max chip, 16GB RAM, and stunning Liquid Retina XDR display. Built for developers, designers, and creative professionals who demand the best performance and battery life.',
    shortDescription: 'Professional laptop with M3 Max chip and XDR display',
    price: 2500000,
    compareAtPrice: 3000000,
    quantity: 15,
    averageRating: 4.9,
    totalReviews: 85,
    totalSales: 52,
    views: 1800,
    lowStockThreshold: 3,
    sku: 'MBP16-M3MAX-SG',
    images: ['https://picsum.photos/id/0/800/800'],
    tags: ['laptop', 'apple', 'macbook', 'professional'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 2.16,
    keyFeatures: [
      'M3 Max chip with 40-core GPU for professional workflows',
      '16GB unified memory for seamless multitasking',
      'Liquid Retina XDR display with 1000 nits brightness',
      'Up to 22 hours battery life for all-day productivity',
      'MagSafe 3 charging port with fast charging support'
    ],
    specifications: {
      'Display': '16-inch Liquid Retina XDR (3456 x 2234)',
      'Processor': 'Apple M3 Max chip',
      'Memory': '16GB unified memory',
      'Storage': '512GB SSD',
      'Graphics': '40-core GPU',
      'Battery': 'Up to 22 hours',
      'Ports': '3x Thunderbolt 4, HDMI, SD card, MagSafe 3',
      'Weight': '2.16kg',
      'Warranty': '1 Year AppleCare'
    }
  },
  {
    name: 'Sony WH-1000XM5',
    description: 'Industry-leading noise canceling headphones with premium sound quality. Experience music like never before with Hi-Res Audio, LDAC support, and adaptive sound control.',
    shortDescription: 'Industry-leading noise canceling headphones',
    price: 180000,
    compareAtPrice: 220000,
    quantity: 100,
    averageRating: 4.6,
    totalReviews: 210,
    totalSales: 145,
    views: 3200,
    lowStockThreshold: 20,
    sku: 'SONY-WH1000XM5-BLK',
    images: ['https://picsum.photos/id/90/800/800'],
    tags: ['headphones', 'sony', 'audio', 'noise-canceling'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.25,
    keyFeatures: [
      'Industry-leading noise cancellation technology',
      'Exceptional sound quality with LDAC codec support',
      'Up to 30 hours battery life with quick charging',
      'Speak-to-Chat technology automatically pauses music',
      'Comfortable lightweight design for all-day wear'
    ],
    specifications: {
      'Driver': '30mm dynamic driver',
      'Frequency Response': '4Hz-40,000Hz',
      'Battery Life': 'Up to 30 hours',
      'Charging': 'USB-C quick charging (3 min = 3 hours)',
      'Weight': '250g',
      'Connectivity': 'Bluetooth 5.2, NFC, wired 3.5mm',
      'Colors': 'Black, Silver',
      'Noise Cancellation': 'Adaptive Sound Control',
      'Warranty': '1 Year International Warranty'
    }
  },
  {
    name: 'Nike Air Max 270',
    description: 'Comfortable lifestyle sneakers with Max Air cushioning. Perfect for everyday wear with breathable mesh upper and durable rubber outsole.',
    shortDescription: 'Comfortable lifestyle sneakers with Max Air',
    price: 85000,
    compareAtPrice: 120000,
    quantity: 45,
    averageRating: 4.5,
    totalReviews: 156,
    totalSales: 98,
    views: 2800,
    lowStockThreshold: 10,
    sku: 'NIKE-AM270-WHT-42',
    images: ['https://picsum.photos/id/21/800/800'],
    tags: ['shoes', 'nike', 'sneakers', 'fashion'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.4,
    keyFeatures: [
      'Max Air cushioning unit for ultimate comfort',
      'Breathable mesh upper keeps feet cool',
      'Durable rubber outsole provides traction',
      'Lightweight design for all-day wear',
      'Classic Nike Air Max style and branding'
    ],
    specifications: {
      'Upper Material': 'Mesh and synthetic leather',
      'Sole': 'Rubber with Air Max unit',
      'Weight': '400g per shoe (size 42)',
      'Available Sizes': '40, 41, 42, 43, 44',
      'Colors': 'White/Black, All Black, White/Red',
      'Care': 'Wipe clean with damp cloth',
      'Origin': 'Vietnam',
      'Fit': 'True to size',
      'Warranty': '6 Months manufacturing defect'
    }
  },
  {
    name: 'Elegant Sofa Set',
    description: '3-seater sofa with premium fabric and modern design. Solid wood frame with high-density foam cushions for ultimate comfort and durability.',
    shortDescription: '3-seater sofa with premium fabric',
    price: 450000,
    compareAtPrice: 600000,
    quantity: 8,
    averageRating: 4.7,
    totalReviews: 45,
    totalSales: 23,
    views: 890,
    lowStockThreshold: 2,
    sku: 'SOFA-3S-GRY',
    images: ['https://picsum.photos/id/106/800/800'],
    tags: ['furniture', 'sofa', 'home', 'living-room'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 85,
    keyFeatures: [
      'Premium fabric upholstery that is soft and durable',
      'Solid wood frame construction for longevity',
      'High-density foam cushions for comfort',
      'Modern minimalist design fits any decor',
      'Easy assembly with included tools and instructions'
    ],
    specifications: {
      'Seating Capacity': '3 persons',
      'Frame Material': 'Solid wood',
      'Upholstery': 'Premium polyester fabric',
      'Cushion Fill': 'High-density foam',
      'Dimensions': '220cm (L) x 90cm (D) x 85cm (H)',
      'Seat Height': '45cm',
      'Weight': '85kg',
      'Color': 'Grey',
      'Assembly': 'Required (instructions included)',
      'Warranty': '2 Years structural warranty'
    }
  },
  {
    name: 'The Lean Startup Book',
    description: 'Best-selling business book by Eric Ries. Learn the revolutionary approach to building successful startups through continuous innovation and validated learning.',
    shortDescription: 'Best-selling business methodology book',
    price: 8500,
    compareAtPrice: 12000,
    quantity: 200,
    averageRating: 4.8,
    totalReviews: 320,
    totalSales: 287,
    views: 4500,
    lowStockThreshold: 30,
    sku: 'BOOK-LEAN-STARTUP',
    images: ['https://picsum.photos/id/24/800/800'],
    tags: ['book', 'business', 'startup', 'entrepreneurship'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.35,
    keyFeatures: [
      'International bestseller read by millions',
      'Practical business methodology you can apply immediately',
      'Real-world case studies from successful companies',
      'Easy to understand concepts and frameworks',
      'Perfect for entrepreneurs and business students'
    ],
    specifications: {
      'Author': 'Eric Ries',
      'Publisher': 'Crown Business',
      'Pages': '336 pages',
      'Language': 'English',
      'Format': 'Paperback',
      'ISBN-10': '0307887898',
      'ISBN-13': '978-0307887894',
      'Dimensions': '20.3 x 13.3 x 2.3 cm',
      'Weight': '350g',
      'Publication Date': 'September 13, 2011'
    }
  },
  {
    name: 'Gaming Mouse Razer DeathAdder',
    description: 'Professional gaming mouse with RGB lighting and 20K DPI sensor. Ergonomic design with programmable buttons for competitive gaming.',
    shortDescription: 'Professional gaming mouse with 20K DPI',
    price: 45000,
    compareAtPrice: 65000,
    quantity: 75,
    averageRating: 4.6,
    totalReviews: 180,
    totalSales: 123,
    views: 2300,
    lowStockThreshold: 15,
    sku: 'RAZER-MOUSE-DA-V3',
    images: ['https://picsum.photos/id/96/800/800'],
    tags: ['gaming', 'mouse', 'razer', 'accessories'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.105,
    keyFeatures: [
      '20,000 DPI optical sensor for precision',
      'RGB Chroma lighting with 16.8 million colors',
      'Ergonomic right-handed design',
      '8 programmable buttons for macros',
      'Durable mechanical switches rated for 70 million clicks'
    ],
    specifications: {
      'Sensor': 'Focus+ 20K Optical Sensor',
      'DPI': 'Up to 20,000 (adjustable)',
      'Buttons': '8 programmable buttons',
      'Lighting': 'Razer Chroma RGB',
      'Cable': '1.8m braided fiber cable',
      'Polling Rate': '1000 Hz',
      'Weight': '105g',
      'Compatibility': 'Windows, Mac',
      'Software': 'Razer Synapse 3',
      'Warranty': '2 Years'
    }
  },
  {
    name: 'Mechanical Keyboard RGB',
    description: 'Cherry MX Blue switches with customizable RGB backlight. Full-size layout with dedicated media keys and aluminum frame.',
    shortDescription: 'Mechanical keyboard with Cherry MX switches',
    price: 75000,
    compareAtPrice: 95000,
    quantity: 40,
    averageRating: 4.7,
    totalReviews: 145,
    totalSales: 89,
    views: 1950,
    lowStockThreshold: 10,
    sku: 'MECH-KB-RGB-BLU',
    images: ['https://picsum.photos/id/201/800/800'],
    tags: ['keyboard', 'gaming', 'mechanical', 'rgb'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 1.2,
    keyFeatures: [
      'Cherry MX Blue mechanical switches for tactile feedback',
      'Customizable per-key RGB backlighting',
      'Aluminum top plate for durability',
      'Full-size layout with numpad and media keys',
      'Detachable braided USB cable'
    ],
    specifications: {
      'Switch Type': 'Cherry MX Blue (tactile & clicky)',
      'Layout': 'Full-size 104 keys',
      'Backlighting': 'Per-key RGB',
      'Frame': 'Aluminum top plate',
      'Keycaps': 'Double-shot PBT',
      'Cable': '1.8m detachable braided USB-C',
      'Polling Rate': '1000 Hz',
      'Weight': '1.2kg',
      'Dimensions': '44cm x 13cm x 3.5cm',
      'Warranty': '2 Years'
    }
  },
  {
    name: 'Smart Watch Pro',
    description: 'Fitness tracker with heart rate monitor and GPS. Track your workouts, sleep, and health metrics with this advanced smartwatch.',
    shortDescription: 'Fitness tracker with heart rate and GPS',
    price: 120000,
    compareAtPrice: 150000,
    quantity: 60,
    averageRating: 4.4,
    totalReviews: 230,
    totalSales: 156,
    views: 3100,
    lowStockThreshold: 15,
    sku: 'WATCH-SMART-PRO',
    images: ['https://picsum.photos/id/225/800/800'],
    tags: ['smartwatch', 'fitness', 'health', 'wearable'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.045,
    keyFeatures: [
      'Advanced heart rate monitoring 24/7',
      'Built-in GPS for accurate tracking',
      'Sleep tracking with detailed insights',
      'Water-resistant up to 50 meters',
      '7-day battery life with fast charging'
    ],
    specifications: {
      'Display': '1.4-inch AMOLED touchscreen',
      'Sensors': 'Heart rate, GPS, accelerometer, gyroscope',
      'Battery': '7 days typical use, 2 hours charging',
      'Water Resistance': '5ATM (50 meters)',
      'Compatibility': 'iOS 13+, Android 6+',
      'Connectivity': 'Bluetooth 5.0',
      'Weight': '45g',
      'Strap': 'Silicone (interchangeable)',
      'Warranty': '1 Year'
    }
  },
  {
    name: 'Portable Bluetooth Speaker',
    description: 'Waterproof speaker with 20-hour battery life. Perfect for outdoor adventures with powerful 360-degree sound.',
    shortDescription: 'Waterproof portable speaker',
    price: 35000,
    compareAtPrice: 45000,
    quantity: 120,
    averageRating: 4.5,
    totalReviews: 340,
    totalSales: 267,
    views: 4200,
    lowStockThreshold: 25,
    sku: 'SPEAKER-BT-PORT',
    images: ['https://picsum.photos/id/145/800/800'],
    tags: ['speaker', 'bluetooth', 'audio', 'portable'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.6,
    keyFeatures: [
      '360-degree sound with powerful bass',
      'IPX7 waterproof rating for any weather',
      '20-hour battery life for extended use',
      'Wireless stereo pairing with second speaker',
      'Built-in microphone for hands-free calls'
    ],
    specifications: {
      'Output Power': '20W stereo',
      'Frequency Response': '60Hz - 20kHz',
      'Battery': '20 hours playback',
      'Charging': 'USB-C, 3 hours full charge',
      'Bluetooth': '5.0 with 30m range',
      'Water Resistance': 'IPX7 (submersible)',
      'Weight': '600g',
      'Dimensions': '18cm x 6cm',
      'Colors': 'Black, Blue, Red',
      'Warranty': '1 Year'
    }
  },
  {
    name: 'Wireless Earbuds Pro',
    description: 'Active noise cancellation with wireless charging case. Premium sound quality with comfortable fit for all-day wear.',
    shortDescription: 'ANC earbuds with wireless charging',
    price: 95000,
    compareAtPrice: 130000,
    quantity: 85,
    averageRating: 4.6,
    totalReviews: 275,
    totalSales: 198,
    views: 3600,
    lowStockThreshold: 20,
    sku: 'EARBUDS-WL-PRO',
    images: ['https://picsum.photos/id/367/800/800'],
    tags: ['earbuds', 'wireless', 'audio', 'anc'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.05,
    keyFeatures: [
      'Active noise cancellation blocks unwanted sound',
      'Transparency mode for awareness',
      'Wireless charging case with 24-hour battery',
      'IPX4 water and sweat resistance',
      'Touch controls for music and calls'
    ],
    specifications: {
      'Driver': '10mm dynamic drivers',
      'ANC': 'Hybrid active noise cancellation',
      'Battery': '6 hours + 18 hours (case)',
      'Charging': 'USB-C and wireless Qi charging',
      'Bluetooth': '5.2 with AAC codec',
      'Water Resistance': 'IPX4',
      'Weight': '5g per earbud',
      'Fit': 'In-ear with 3 sizes tips',
      'Colors': 'Black, White',
      'Warranty': '1 Year'
    }
  },
  {
    name: 'LED Desk Lamp',
    description: 'Adjustable brightness desk lamp with USB charging port. Eye-care LED technology with multiple color temperatures.',
    shortDescription: 'Adjustable LED desk lamp with USB port',
    price: 25000,
    compareAtPrice: 35000,
    quantity: 150,
    averageRating: 4.3,
    totalReviews: 120,
    totalSales: 87,
    views: 1700,
    lowStockThreshold: 30,
    sku: 'LAMP-DESK-LED',
    images: ['https://picsum.photos/id/447/800/800'],
    tags: ['lamp', 'desk', 'led', 'home'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.8,
    keyFeatures: [
      'Adjustable brightness with 5 levels',
      '3 color temperature modes (warm/neutral/cool)',
      'Built-in USB charging port for devices',
      'Flexible gooseneck arm for precise positioning',
      'Eye-care LED technology reduces strain'
    ],
    specifications: {
      'Light Source': '36 LED bulbs',
      'Brightness Levels': '5 levels (50-500 lux)',
      'Color Temperature': '3000K - 6000K',
      'USB Port': '5V/1A charging output',
      'Arm Length': '40cm adjustable gooseneck',
      'Power': '12W LED',
      'Lifespan': '50,000 hours',
      'Base': 'Weighted stable base',
      'Weight': '800g',
      'Warranty': '1 Year'
    }
  },
  {
    name: 'Yoga Mat Premium',
    description: 'Non-slip exercise mat with carrying strap. Eco-friendly TPE material with excellent cushioning for all types of yoga.',
    shortDescription: 'Non-slip premium yoga mat',
    price: 15000,
    compareAtPrice: 22000,
    quantity: 200,
    averageRating: 4.7,
    totalReviews: 189,
    totalSales: 145,
    views: 2400,
    lowStockThreshold: 40,
    sku: 'YOGA-MAT-PREM',
    images: ['https://picsum.photos/id/548/800/800'],
    tags: ['yoga', 'fitness', 'exercise', 'mat'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 1.1,
    keyFeatures: [
      'Non-slip textured surface on both sides',
      'Eco-friendly TPE material (no PVC)',
      '6mm thickness for optimal cushioning',
      'Lightweight and easy to roll up',
      'Includes carrying strap and storage bag'
    ],
    specifications: {
      'Material': 'TPE (Thermoplastic Elastomer)',
      'Thickness': '6mm',
      'Dimensions': '183cm x 61cm',
      'Weight': '1.1kg',
      'Texture': 'Non-slip on both sides',
      'Density': 'High-density cushioning',
      'Colors': 'Purple, Blue, Pink, Black',
      'Care': 'Wipe with damp cloth',
      'Eco-Friendly': 'Yes (recyclable)',
      'Warranty': '6 Months'
    }
  },
  {
    name: 'Coffee Maker Automatic',
    description: 'Programmable coffee maker with thermal carafe. Brew perfect coffee every morning with customizable strength and timer.',
    shortDescription: 'Programmable coffee maker with carafe',
    price: 85000,
    compareAtPrice: 110000,
    quantity: 35,
    averageRating: 4.5,
    totalReviews: 156,
    totalSales: 78,
    views: 1650,
    lowStockThreshold: 8,
    sku: 'COFFEE-AUTO-TH',
    images: ['https://picsum.photos/id/431/800/800'],
    tags: ['coffee', 'kitchen', 'appliance', 'automatic'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 2.5,
    keyFeatures: [
      'Programmable 24-hour timer',
      'Thermal carafe keeps coffee hot for hours',
      'Brew strength selector (regular/bold)',
      'Auto shut-off for safety',
      'Permanent washable filter included'
    ],
    specifications: {
      'Capacity': '12 cups (1.8L)',
      'Carafe': 'Double-wall thermal stainless steel',
      'Timer': '24-hour programmable',
      'Brew Strength': '2 settings (regular/bold)',
      'Water Window': 'Easy-view with measurements',
      'Auto Shut-off': 'Yes',
      'Filter': 'Permanent gold-tone filter',
      'Power': '900W',
      'Weight': '2.5kg',
      'Warranty': '2 Years'
    }
  },
  {
    name: 'Backpack Laptop Travel',
    description: 'Water-resistant backpack with padded laptop compartment. TSA-friendly design with multiple pockets for organization.',
    shortDescription: 'Water-resistant laptop backpack',
    price: 45000,
    compareAtPrice: 60000,
    quantity: 90,
    averageRating: 4.6,
    totalReviews: 203,
    totalSales: 134,
    views: 2750,
    lowStockThreshold: 18,
    sku: 'BAG-BACK-LAPTOP',
    images: ['https://picsum.photos/id/312/800/800'],
    tags: ['backpack', 'laptop', 'travel', 'bag'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.9,
    keyFeatures: [
      'Padded compartment fits up to 17-inch laptop',
      'Water-resistant durable polyester fabric',
      'TSA-friendly lay-flat design',
      'USB charging port for power bank',
      'Multiple pockets for organization'
    ],
    specifications: {
      'Laptop Size': 'Up to 17 inches',
      'Material': 'Water-resistant polyester',
      'Capacity': '30 liters',
      'Compartments': 'Main, laptop, tablet, front organizer',
      'USB Port': 'External charging port (power bank not included)',
      'Straps': 'Padded adjustable shoulder straps',
      'Handle': 'Top carry handle',
      'Weight': '900g',
      'Dimensions': '48cm x 32cm x 20cm',
      'Warranty': '1 Year'
    }
  },
  {
    name: 'Air Fryer Digital',
    description: 'Healthy cooking with 8 preset programs and digital display. Cook crispy food with up to 85% less fat than traditional frying.',
    shortDescription: 'Digital air fryer with 8 presets',
    price: 125000,
    compareAtPrice: 160000,
    quantity: 45,
    averageRating: 4.8,
    totalReviews: 287,
    totalSales: 167,
    views: 3400,
    lowStockThreshold: 10,
    sku: 'AIRFRYER-DIG-8L',
    images: ['https://picsum.photos/id/292/800/800'],
    tags: ['airfryer', 'kitchen', 'cooking', 'appliance'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 5.2,
    keyFeatures: [
      '8 preset programs for various foods',
      'Digital touchscreen with LED display',
      '8-liter capacity for family meals',
      'Rapid air circulation technology',
      'Dishwasher-safe removable basket'
    ],
    specifications: {
      'Capacity': '8 liters',
      'Power': '1800W',
      'Temperature Range': '80°C - 200°C',
      'Timer': 'Up to 60 minutes',
      'Presets': 'Fries, Chicken, Steak, Fish, Shrimp, Pizza, Cake, Bacon',
      'Basket': 'Non-stick, dishwasher safe',
      'Display': 'Digital LED touchscreen',
      'Safety': 'Auto shut-off, overheat protection',
      'Weight': '5.2kg',
      'Warranty': '2 Years'
    }
  },
  {
    name: 'Running Shoes Marathon',
    description: 'Lightweight running shoes with breathable mesh. Designed for marathon runners with responsive cushioning.',
    shortDescription: 'Lightweight marathon running shoes',
    price: 65000,
    compareAtPrice: 85000,
    quantity: 110,
    averageRating: 4.4,
    totalReviews: 198,
    totalSales: 143,
    views: 2900,
    lowStockThreshold: 22,
    sku: 'SHOE-RUN-MARA',
    images: ['https://picsum.photos/id/389/800/800'],
    tags: ['shoes', 'running', 'sports', 'fitness'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.6,
    keyFeatures: [
      'Lightweight design (only 600g per pair)',
      'Breathable mesh upper keeps feet cool',
      'Responsive foam cushioning',
      'Durable rubber outsole with traction',
      'Reflective details for night running'
    ],
    specifications: {
      'Upper': 'Engineered mesh',
      'Midsole': 'EVA foam with Boost technology',
      'Outsole': 'Continental rubber',
      'Weight': '300g per shoe (size 42)',
      'Drop': '10mm heel-to-toe',
      'Available Sizes': '39-46',
      'Width': 'Standard (D)',
      'Fit': 'True to size',
      'Colors': 'Black/White, Blue/Orange, Red/Black',
      'Warranty': '6 Months'
    }
  },
  {
    name: 'Water Bottle Insulated',
    description: 'Stainless steel bottle keeps drinks cold for 24 hours. Double-wall vacuum insulation with leak-proof lid.',
    shortDescription: 'Insulated stainless steel water bottle',
    price: 12000,
    compareAtPrice: 18000,
    quantity: 300,
    averageRating: 4.7,
    totalReviews: 421,
    totalSales: 356,
    views: 5100,
    lowStockThreshold: 60,
    sku: 'BOTTLE-INS-750ML',
    images: ['https://picsum.photos/id/453/800/800'],
    tags: ['bottle', 'water', 'insulated', 'sports'],
    productType: 'physical',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 0.4,
    keyFeatures: [
      'Keeps cold for 24 hours, hot for 12 hours',
      'Double-wall vacuum insulation',
      'Leak-proof screw cap lid',
      'BPA-free food-grade stainless steel',
      'Wide mouth for easy filling and cleaning'
    ],
    specifications: {
      'Capacity': '750ml',
      'Material': '18/8 stainless steel',
      'Insulation': 'Double-wall vacuum',
      'Cold Retention': '24 hours',
      'Hot Retention': '12 hours',
      'Mouth Width': '5cm wide',
      'Lid': 'Leak-proof screw cap',
      'Weight': '400g (empty)',
      'Height': '26cm',
      'Colors': 'Black, Silver, Blue, Pink',
      'Warranty': '1 Year'
    }
  },
  {
    name: 'Office Chair Ergonomic',
    description: 'Adjustable office chair with lumbar support. Designed for long hours of comfortable sitting with breathable mesh back.',
    shortDescription: 'Ergonomic office chair with lumbar support',
    price: 250000,
    compareAtPrice: 320000,
    quantity: 25,
    averageRating: 4.6,
    totalReviews: 142,
    totalSales: 67,
    views: 1850,
    lowStockThreshold: 5,
    sku: 'CHAIR-OFF-ERG',
    images: ['https://picsum.photos/id/497/800/800'],
    tags: ['chair', 'office', 'furniture', 'ergonomic'],
    productType: 'physical',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 10,
    weight: 15.5,
    keyFeatures: [
      'Adjustable lumbar support for back health',
      'Breathable mesh back keeps you cool',
      'Height-adjustable seat and armrests',
      '360-degree swivel with smooth-rolling casters',
      'Recline function with tension control'
    ],
    specifications: {
      'Back': 'Breathable mesh with lumbar support',
      'Seat': 'High-density foam cushion',
      'Adjustments': 'Height, armrests, lumbar, recline',
      'Weight Capacity': '120kg',
      'Seat Height': '44-54cm adjustable',
      'Recline': '90-120 degrees',
      'Armrests': '3D adjustable',
      'Base': '5-star nylon base with PU casters',
      'Weight': '15.5kg',
      'Assembly': 'Required (30 minutes)',
      'Warranty': '3 Years'
    }
  },
];

// 20 Digital Products with keyFeatures and specifications
const digitalProducts = [
  {
    name: 'Premium UI/UX Design Course',
    description: 'Complete UI/UX design masterclass with 50+ hours of video content and projects. Learn design thinking, wireframing, prototyping, user research, and modern design tools like Figma and Adobe XD.',
    shortDescription: 'Master UI/UX design with 50+ hours of comprehensive video content',
    price: 45000,
    quantity: 999,
    averageRating: 4.9,
    totalReviews: 450,
    totalSales: 389,
    views: 5200,
    lowStockThreshold: 0,
    sku: 'COURSE-UIUX-2024',
    images: ['https://picsum.photos/id/30/800/800'],
    tags: ['course', 'design', 'ui', 'ux', 'digital'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '50+ hours of comprehensive video content',
      '15 real-world design projects to build portfolio',
      'Figma and Adobe XD mastery training',
      'Certificate of completion upon finishing',
      'Lifetime access with free content updates'
    ],
    specifications: {
      'Duration': '50+ hours of video content',
      'Level': 'Beginner to Advanced',
      'Language': 'English with subtitles available',
      'Projects': '15 hands-on design projects',
      'Software': 'Figma (free) and Adobe XD trial included',
      'Certificate': 'Yes - professional certificate',
      'Access': 'Lifetime access on all devices',
      'Updates': 'Free lifetime updates and new content',
      'Support': 'Q&A forum and email support',
      'Requirements': 'Computer with internet connection'
    }
  },
  {
    name: 'Full-Stack Web Development Bootcamp',
    description: 'Learn HTML, CSS, JavaScript, React, Node.js and MongoDB. Build real-world projects and deploy them. Perfect for beginners and intermediate developers looking to become full-stack developers.',
    shortDescription: 'Complete web development course from beginner to advanced',
    price: 65000,
    quantity: 999,
    averageRating: 4.8,
    totalReviews: 620,
    totalSales: 512,
    views: 6800,
    lowStockThreshold: 0,
    sku: 'COURSE-FULLSTACK',
    images: ['https://picsum.photos/id/326/800/800'],
    tags: ['course', 'programming', 'web', 'development'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Complete web development curriculum',
      'Build 20+ real-world projects',
      'HTML, CSS, JavaScript, React, Node.js, MongoDB',
      'Learn to deploy live applications',
      'Career guidance and interview preparation'
    ],
    specifications: {
      'Duration': '80+ hours of content',
      'Level': 'Beginner friendly',
      'Language': 'English',
      'Projects': '20+ full-stack applications',
      'Technologies': 'HTML, CSS, JS, React, Node, MongoDB, Git',
      'Certificate': 'Yes - professional certificate',
      'Access': 'Lifetime access',
      'Support': '24/7 Q&A forum with instructor',
      'Prerequisites': 'Basic computer skills',
      'Deployment': 'Heroku, Netlify, Vercel training included'
    }
  },
  {
    name: 'Python for Data Science',
    description: 'Master Python, Pandas, NumPy and data visualization. Learn data analysis, machine learning basics, and work with real datasets to solve practical problems.',
    shortDescription: 'Complete Python data science course with hands-on projects',
    price: 55000,
    quantity: 999,
    averageRating: 4.7,
    totalReviews: 380,
    totalSales: 298,
    views: 4500,
    lowStockThreshold: 0,
    sku: 'COURSE-PYTHON-DS',
    images: ['https://picsum.photos/id/180/800/800'],
    tags: ['course', 'python', 'data-science', 'programming'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Master Python programming from basics',
      'Pandas and NumPy for data manipulation',
      'Data visualization with Matplotlib and Seaborn',
      'Work with real datasets and case studies',
      'Introduction to machine learning basics'
    ],
    specifications: {
      'Duration': '60+ hours',
      'Level': 'Beginner to Intermediate',
      'Language': 'English',
      'Projects': '12 data science projects',
      'Libraries': 'Pandas, NumPy, Matplotlib, Seaborn, Scikit-learn',
      'Certificate': 'Professional certificate',
      'Access': 'Lifetime access',
      'Support': 'Instructor Q&A and community',
      'Software': 'Python 3.x, Jupyter Notebooks',
      'Datasets': 'Real-world datasets included'
    }
  },
  {
    name: 'Digital Marketing Masterclass',
    description: 'SEO, Social Media, Email Marketing and Google Ads. Complete digital marketing training with certification to boost your career or business.',
    shortDescription: 'Master digital marketing from SEO to social media',
    price: 40000,
    quantity: 999,
    averageRating: 4.6,
    totalReviews: 290,
    totalSales: 234,
    views: 3900,
    lowStockThreshold: 0,
    sku: 'COURSE-DIGMKT',
    images: ['https://picsum.photos/id/256/800/800'],
    tags: ['course', 'marketing', 'seo', 'digital'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Complete digital marketing training',
      'SEO, Google Analytics and Google Ads',
      'Social media marketing strategy',
      'Email marketing campaigns and automation',
      'Google Ads and Analytics certification prep'
    ],
    specifications: {
      'Duration': '40+ hours',
      'Level': 'Beginner to Advanced',
      'Language': 'English',
      'Modules': 'SEO, Social Media, Email, PPC, Analytics, Content',
      'Certificate': 'Yes - accredited certificate',
      'Tools': 'Google Analytics, SEMrush, Mailchimp, Hootsuite',
      'Access': 'Lifetime access',
      'Support': 'Community forum and email support',
      'Updates': 'Monthly content updates',
      'Certification Prep': 'Google Ads and Analytics exams'
    }
  },
  {
    name: 'Mobile App Development with React Native',
    description: 'Build iOS and Android apps with React Native. Learn navigation, state management, API integration, and how to publish apps to stores.',
    shortDescription: 'Build mobile apps for iOS and Android with React Native',
    price: 58000,
    quantity: 999,
    averageRating: 4.8,
    totalReviews: 340,
    totalSales: 287,
    views: 4200,
    lowStockThreshold: 0,
    sku: 'COURSE-REACT-NATIVE',
    images: ['https://picsum.photos/id/119/800/800'],
    tags: ['course', 'mobile', 'react-native', 'app'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Build iOS and Android apps simultaneously',
      'React Native and Expo framework',
      'Navigation, state management with Redux',
      'API integration and authentication',
      'Publish to App Store and Google Play Store'
    ],
    specifications: {
      'Duration': '55+ hours',
      'Level': 'Intermediate',
      'Language': 'English',
      'Projects': '8 complete mobile applications',
      'Technologies': 'React Native, Expo, Redux, Firebase',
      'Certificate': 'Yes - professional certificate',
      'Access': 'Lifetime access',
      'Support': 'Direct instructor support',
      'Prerequisites': 'Basic JavaScript knowledge recommended',
      'Platform': 'Build for both iOS and Android'
    }
  },
  {
    name: 'Graphic Design Fundamentals',
    description: 'Adobe Photoshop, Illustrator and InDesign for beginners. Learn design principles, color theory, typography, and create professional graphics.',
    shortDescription: 'Master Adobe Creative Suite for graphic design',
    price: 48000,
    quantity: 999,
    averageRating: 4.7,
    totalReviews: 275,
    totalSales: 219,
    views: 3600,
    lowStockThreshold: 0,
    sku: 'COURSE-GRAPHIC-DES',
    images: ['https://picsum.photos/id/367/800/800'],
    tags: ['course', 'design', 'graphics', 'adobe'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Master Adobe Photoshop, Illustrator, and InDesign',
      'Learn design principles and color theory',
      'Typography and layout best practices',
      'Create logos, posters, and brand identity',
      'Portfolio-ready projects included'
    ],
    specifications: {
      'Duration': '45+ hours',
      'Level': 'Beginner to Intermediate',
      'Language': 'English',
      'Software': 'Photoshop, Illustrator, InDesign',
      'Projects': '20+ design projects',
      'Certificate': 'Yes',
      'Access': 'Lifetime access',
      'Support': 'Q&A forum',
      'Requirements': 'Adobe Creative Cloud (trial available)',
      'Topics': 'Logos, Posters, Branding, Photo Editing'
    }
  },
  {
    name: 'Excel Advanced Techniques',
    description: 'Advanced formulas, pivot tables, macros and data analysis. VBA programming and dashboard creation for professional Excel users.',
    shortDescription: 'Advanced Excel training with formulas and automation',
    price: 35000,
    quantity: 999,
    averageRating: 4.6,
    totalReviews: 410,
    totalSales: 356,
    views: 4800,
    lowStockThreshold: 0,
    sku: 'COURSE-EXCEL-ADV',
    images: ['https://picsum.photos/id/447/800/800'],
    tags: ['course', 'excel', 'data', 'office'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Advanced formulas (VLOOKUP, INDEX-MATCH, SUMIFS)',
      'Pivot tables and pivot charts mastery',
      'Macros and VBA programming basics',
      'Data analysis and visualization',
      'Professional dashboard creation'
    ],
    specifications: {
      'Duration': '35+ hours',
      'Level': 'Intermediate to Advanced',
      'Language': 'English',
      'Software': 'Microsoft Excel 2016 or later',
      'Topics': 'Formulas, Pivot Tables, Macros, VBA, Dashboards',
      'Certificate': 'Yes',
      'Access': 'Lifetime access',
      'Support': 'Email and forum support',
      'Files': 'Practice files and templates included',
      'Requirements': 'Basic Excel knowledge'
    }
  },
  {
    name: 'Photography Masterclass',
    description: 'Complete guide to DSLR photography and photo editing. Learn composition, lighting, camera settings, and master Lightroom for professional results.',
    shortDescription: 'Professional photography course with editing tutorials',
    price: 42000,
    quantity: 999,
    averageRating: 4.8,
    totalReviews: 325,
    totalSales: 267,
    views: 4100,
    lowStockThreshold: 0,
    sku: 'COURSE-PHOTO-MASTER',
    images: ['https://picsum.photos/id/225/800/800'],
    tags: ['course', 'photography', 'camera', 'editing'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Complete DSLR photography training',
      'Composition and lighting techniques',
      'Master manual camera settings',
      'Photo editing with Adobe Lightroom',
      'Portrait, landscape, and product photography'
    ],
    specifications: {
      'Duration': '48+ hours',
      'Level': 'Beginner to Advanced',
      'Language': 'English',
      'Camera': 'DSLR or mirrorless camera needed',
      'Software': 'Adobe Lightroom (trial included)',
      'Certificate': 'Yes',
      'Access': 'Lifetime access',
      'Support': 'Photography community and instructor feedback',
      'Projects': '10+ photography assignments',
      'Topics': 'Portrait, Landscape, Street, Product Photography'
    }
  },
  {
    name: 'Video Editing with Premiere Pro',
    description: 'Professional video editing and post-production. Color grading, effects, transitions, and audio editing for YouTube, social media, and professional work.',
    shortDescription: 'Master Adobe Premiere Pro for video editing',
    price: 52000,
    quantity: 999,
    averageRating: 4.7,
    totalReviews: 298,
    totalSales: 234,
    views: 3800,
    lowStockThreshold: 0,
    sku: 'COURSE-VIDEO-EDIT',
    images: ['https://picsum.photos/id/548/800/800'],
    tags: ['course', 'video', 'editing', 'premiere'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Master Adobe Premiere Pro CC',
      'Professional video editing workflow',
      'Color grading and correction',
      'Motion graphics and visual effects',
      'Audio editing and mixing'
    ],
    specifications: {
      'Duration': '50+ hours',
      'Level': 'Beginner to Professional',
      'Language': 'English',
      'Software': 'Adobe Premiere Pro CC',
      'Projects': '15+ video editing projects',
      'Certificate': 'Yes',
      'Access': 'Lifetime access',
      'Support': 'Instructor feedback on projects',
      'Requirements': 'Computer with 8GB RAM minimum',
      'Topics': 'Editing, Color Grading, Effects, Audio, Export'
    }
  },
  {
    name: 'Business Plan Templates Pack',
    description: '50+ professional business plan templates in Word and PowerPoint. Includes financial projections, pitch decks, executive summaries, and more for startups and established businesses.',
    shortDescription: '50+ business plan templates ready to use',
    price: 15000,
    quantity: 999,
    averageRating: 4.5,
    totalReviews: 189,
    totalSales: 156,
    views: 2400,
    lowStockThreshold: 0,
    sku: 'TEMPLATE-BIZPLAN',
    images: ['https://picsum.photos/id/431/800/800'],
    tags: ['template', 'business', 'plan', 'document'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 30,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '50+ professional business plan templates',
      'Financial projection spreadsheets',
      'Pitch deck templates for investors',
      'Executive summary templates',
      'Easy to customize in Word and PowerPoint'
    ],
    specifications: {
      'Format': 'Word (DOCX) and PowerPoint (PPTX)',
      'Templates': '50+ business plan templates',
      'Industries': 'Tech, Retail, Service, Manufacturing, etc.',
      'Includes': 'Financial models, pitch decks, summaries',
      'Compatibility': 'Microsoft Office 2016+, Google Docs',
      'License': 'Commercial use allowed',
      'Access': 'Instant download',
      'Updates': 'Free template updates',
      'Support': 'Email support',
      'Language': 'English'
    }
  },
  {
    name: 'Financial Literacy E-Book',
    description: 'Complete guide to personal finance and investing. Budgeting, saving, investing strategies, retirement planning, and building long-term wealth.',
    shortDescription: 'Complete personal finance guide for beginners',
    price: 12000,
    quantity: 999,
    averageRating: 4.6,
    totalReviews: 234,
    totalSales: 198,
    views: 2900,
    lowStockThreshold: 0,
    sku: 'EBOOK-FINANCE',
    images: ['https://picsum.photos/id/312/800/800'],
    tags: ['ebook', 'finance', 'investing', 'money'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 30,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Comprehensive personal finance guide',
      'Budgeting and saving strategies',
      'Investment fundamentals explained',
      'Retirement planning roadmap',
      'Wealth-building principles'
    ],
    specifications: {
      'Format': 'PDF, EPUB, MOBI',
      'Pages': '250+ pages',
      'Language': 'English',
      'Topics': 'Budgeting, Saving, Investing, Retirement, Taxes',
      'Bonus': 'Budget templates and calculators',
      'Compatibility': 'All devices (phone, tablet, computer)',
      'Access': 'Instant download',
      'Updates': 'Annual updated editions',
      'Support': 'Email support',
      'License': 'Personal use'
    }
  },
  {
    name: 'Stock Photo Bundle - Business',
    description: '500 high-resolution business stock photos. Commercial license included. Perfect for websites, presentations, social media, and marketing materials.',
    shortDescription: '500 professional business stock photos',
    price: 25000,
    quantity: 999,
    averageRating: 4.7,
    totalReviews: 167,
    totalSales: 134,
    views: 2100,
    lowStockThreshold: 0,
    sku: 'PHOTO-BUNDLE-BIZ',
    images: ['https://picsum.photos/id/292/800/800'],
    tags: ['photos', 'stock', 'business', 'images'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 25,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '500 high-resolution business photos',
      'Commercial license included',
      'Perfect for websites and presentations',
      'Diverse business scenarios covered',
      'JPG format, easy to use'
    ],
    specifications: {
      'Photos': '500 high-quality images',
      'Resolution': 'High resolution (4000x3000px minimum)',
      'Format': 'JPG',
      'Categories': 'Meetings, Office, Team, Technology, Success',
      'License': 'Commercial use allowed',
      'Model Release': 'Yes, included',
      'Property Release': 'Yes, included',
      'Access': 'Instant download (zip file)',
      'Updates': 'Quarterly new photo packs',
      'Support': 'Email support'
    }
  },
  {
    name: 'Resume Templates Collection',
    description: '30 professional resume templates for all industries. ATS-friendly designs in Word and PDF formats to help you land your dream job.',
    shortDescription: '30 professional ATS-friendly resume templates',
    price: 8000,
    quantity: 999,
    averageRating: 4.4,
    totalReviews: 312,
    totalSales: 267,
    views: 3500,
    lowStockThreshold: 0,
    sku: 'TEMPLATE-RESUME',
    images: ['https://picsum.photos/id/389/800/800'],
    tags: ['template', 'resume', 'cv', 'career'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 30,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '30 professional resume designs',
      'ATS-friendly for applicant tracking systems',
      'Easy to customize in Word',
      'Cover letter templates included',
      'Multiple industry-specific designs'
    ],
    specifications: {
      'Templates': '30 resume + 30 cover letters',
      'Format': 'Word (DOCX) and PDF',
      'ATS-Friendly': 'Yes, passes ATS scans',
      'Customization': 'Easy edit in Microsoft Word',
      'Industries': 'Tech, Business, Creative, Healthcare, etc.',
      'Pages': '1-2 page layouts',
      'Compatibility': 'Word 2016+, Google Docs',
      'Access': 'Instant download',
      'Guide': 'Resume writing guide included',
      'Support': 'Email support'
    }
  },
  {
    name: 'Social Media Graphics Pack',
    description: '1000+ Instagram, Facebook and Twitter templates. Fully customizable in Canva and Photoshop. Includes stories, posts, ads, and more for consistent branding.',
    shortDescription: '1000+ social media templates for all platforms',
    price: 18000,
    quantity: 999,
    averageRating: 4.6,
    totalReviews: 245,
    totalSales: 198,
    views: 2800,
    lowStockThreshold: 0,
    sku: 'GRAPHICS-SOCIAL',
    images: ['https://picsum.photos/id/453/800/800'],
    tags: ['graphics', 'social-media', 'templates', 'design'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 25,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '1000+ social media templates',
      'Instagram, Facebook, Twitter, LinkedIn',
      'Fully customizable in Canva (free)',
      'Photoshop PSD files included',
      'Stories, posts, ads, covers included'
    ],
    specifications: {
      'Templates': '1000+ designs',
      'Platforms': 'Instagram, Facebook, Twitter, LinkedIn, Pinterest',
      'Format': 'Canva templates + PSD files',
      'Customization': 'Easy drag-and-drop editing',
      'Types': 'Posts, Stories, Ads, Covers, Highlights',
      'License': 'Commercial use allowed',
      'Access': 'Instant download + Canva access',
      'Updates': 'Monthly new template packs',
      'Support': 'Email and video tutorials',
      'Bonus': 'Social media scheduling guide'
    }
  },
  {
    name: 'Meditation Audio Collection',
    description: '50 guided meditation sessions for stress relief. Includes sleep meditations, morning routines, mindfulness exercises, and anxiety management techniques.',
    shortDescription: '50 guided meditation sessions for relaxation',
    price: 22000,
    quantity: 999,
    averageRating: 4.8,
    totalReviews: 456,
    totalSales: 389,
    views: 4900,
    lowStockThreshold: 0,
    sku: 'AUDIO-MEDITATE',
    images: ['https://picsum.photos/id/497/800/800'],
    tags: ['audio', 'meditation', 'wellness', 'mindfulness'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 25,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '50 professionally guided meditation sessions',
      'Sleep meditation and morning energy routines',
      'Stress relief and anxiety management techniques',
      'High-quality audio recordings with calming music',
      'Downloadable MP3 format for offline use'
    ],
    specifications: {
      'Sessions': '50 guided meditations',
      'Total Duration': '10+ hours of audio',
      'Format': 'MP3, high quality 320kbps',
      'Categories': 'Sleep, Stress Relief, Morning Energy, Anxiety',
      'Language': 'English with calming background music',
      'Session Length': '5-30 minutes each',
      'Access': 'Lifetime download access',
      'Compatibility': 'All devices (phone, tablet, computer)',
      'Updates': 'New sessions added monthly',
      'Support': 'Email support'
    }
  },
  {
    name: 'Logo Design Templates',
    description: '200+ customizable logo templates for businesses. Vector files in AI, EPS, and SVG formats. All industries covered from tech to retail.',
    shortDescription: '200+ professional logo templates in vector format',
    price: 28000,
    quantity: 999,
    averageRating: 4.5,
    totalReviews: 198,
    totalSales: 156,
    views: 2300,
    lowStockThreshold: 0,
    sku: 'TEMPLATE-LOGO',
    images: ['https://picsum.photos/id/201/800/800'],
    tags: ['logo', 'branding', 'design', 'templates'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 25,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '200+ professional logo designs',
      'Vector files for unlimited scaling',
      'Easy to customize colors and text',
      'All industries covered',
      'AI, EPS, SVG, and PNG formats'
    ],
    specifications: {
      'Logos': '200+ professional designs',
      'Format': 'AI, EPS, SVG, PNG',
      'Customization': 'Fully editable in Illustrator or Inkscape',
      'Industries': 'Tech, Retail, Food, Real Estate, Healthcare, etc.',
      'Colors': 'Easy to change',
      'License': 'Commercial use allowed',
      'Access': 'Instant download',
      'Software': 'Adobe Illustrator or free alternatives',
      'Updates': 'Quarterly new logo additions',
      'Support': 'Email support and tutorials'
    }
  },
  {
    name: 'Website Landing Page Templates',
    description: '25 responsive HTML/CSS landing page templates. Bootstrap 5, mobile-optimized, and fully customizable for marketing campaigns and product launches.',
    shortDescription: '25 responsive landing page templates',
    price: 35000,
    quantity: 999,
    averageRating: 4.7,
    totalReviews: 213,
    totalSales: 167,
    views: 2600,
    lowStockThreshold: 0,
    sku: 'TEMPLATE-WEB-LAND',
    images: ['https://picsum.photos/id/96/800/800'],
    tags: ['website', 'template', 'html', 'landing-page'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 25,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '25 responsive landing page templates',
      'Built with Bootstrap 5',
      'Mobile-optimized and fast loading',
      'Easy to customize with HTML/CSS',
      'Includes contact forms and CTAs'
    ],
    specifications: {
      'Templates': '25 landing pages',
      'Technology': 'HTML5, CSS3, Bootstrap 5, JavaScript',
      'Responsive': 'Yes, mobile-first design',
      'Customization': 'Easy to edit code',
      'Features': 'Contact forms, CTAs, hero sections, testimonials',
      'Browser Support': 'All modern browsers',
      'Documentation': 'Included with setup guide',
      'License': 'Commercial use allowed',
      'Access': 'Instant download',
      'Support': 'Email support'
    }
  },
  {
    name: 'Productivity Planner Digital',
    description: 'Complete digital planner system for iPad and tablets. Includes daily, weekly, monthly planners, goal trackers, habit trackers, and note-taking pages.',
    shortDescription: 'Digital planner system for iPad and tablets',
    price: 14000,
    quantity: 999,
    averageRating: 4.6,
    totalReviews: 287,
    totalSales: 234,
    views: 3200,
    lowStockThreshold: 0,
    sku: 'PLANNER-DIGITAL',
    images: ['https://picsum.photos/id/145/800/800'],
    tags: ['planner', 'productivity', 'digital', 'organization'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 30,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Complete digital planner for iPad',
      'Daily, weekly, and monthly layouts',
      'Goal trackers and habit trackers',
      'Hyperlinked for easy navigation',
      'Works with GoodNotes, Notability, and Noteshelf'
    ],
    specifications: {
      'Format': 'PDF (hyperlinked)',
      'Compatibility': 'GoodNotes, Notability, Noteshelf',
      'Device': 'iPad, Android tablets with stylus',
      'Pages': '500+ planner pages',
      'Includes': 'Daily, Weekly, Monthly, Goals, Habits, Notes',
      'Hyperlinked': 'Yes, for easy navigation',
      'Dated': 'Undated, reusable',
      'Orientation': 'Portrait',
      'Access': 'Instant download',
      'Support': 'Email support and video tutorials'
    }
  },
  {
    name: 'Music Production Course',
    description: 'Learn beat making, mixing and mastering with FL Studio. Includes sound design, arrangement, music theory basics, and how to release your tracks.',
    shortDescription: 'Complete music production course with FL Studio',
    price: 62000,
    quantity: 999,
    averageRating: 4.8,
    totalReviews: 312,
    totalSales: 256,
    views: 3900,
    lowStockThreshold: 0,
    sku: 'COURSE-MUSIC-PROD',
    images: ['https://picsum.photos/id/326/800/800'],
    tags: ['course', 'music', 'production', 'audio'],
    productType: 'digital',
    status: 'active',
    isFeatured: true,
    isAffiliate: true,
    affiliateCommission: 20,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      'Complete FL Studio music production',
      'Beat making and sound design',
      'Mixing and mastering techniques',
      'Music theory basics',
      'How to release and monetize your music'
    ],
    specifications: {
      'Duration': '60+ hours',
      'Level': 'Beginner to Professional',
      'Language': 'English',
      'Software': 'FL Studio (trial included)',
      'Genres': 'Hip-Hop, EDM, Pop, Trap, House',
      'Projects': '10+ complete tracks',
      'Certificate': 'Yes',
      'Access': 'Lifetime access',
      'Support': 'Producer community and feedback',
      'Bonus': 'Sample packs and presets included'
    }
  },
  {
    name: 'Fitness Workout Programs',
    description: '12-week workout plans with video demonstrations. Includes strength training, cardio routines, nutrition guides, progress trackers, and meal plans.',
    shortDescription: '12-week fitness programs with video guides',
    price: 32000,
    quantity: 999,
    averageRating: 4.7,
    totalReviews: 389,
    totalSales: 312,
    views: 4500,
    lowStockThreshold: 0,
    sku: 'PROGRAM-FITNESS',
    images: ['https://picsum.photos/id/256/800/800'],
    tags: ['fitness', 'workout', 'health', 'program'],
    productType: 'digital',
    status: 'active',
    isFeatured: false,
    isAffiliate: true,
    affiliateCommission: 25,
    requiresLicense: true,
    licenseType: 'lifetime',
    keyFeatures: [
      '12-week progressive workout programs',
      'Video demonstrations for all exercises',
      'Strength training and cardio routines',
      'Nutrition guides and meal plans',
      'Progress tracking spreadsheets'
    ],
    specifications: {
      'Duration': '12 weeks',
      'Format': 'Video (MP4) + PDF guides',
      'Programs': 'Beginner, Intermediate, Advanced',
      'Videos': '100+ exercise demonstrations',
      'Workouts': '4-6 days per week',
      'Equipment': 'Home or gym options',
      'Nutrition': 'Meal plans and recipes included',
      'Tracking': 'Progress sheets and calculators',
      'Access': 'Lifetime access',
      'Support': 'Email support and community'
    }
  },
];

const coupons = [
  {
    code: 'WELCOME20',
    description: 'Welcome discount for new users',
    discountType: 'percentage',
    discountValue: 20,
    minPurchaseAmount: 50000,
    maxDiscountAmount: 20000,
    usageLimit: 1000,
    usagePerUser: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'SAVE5K',
    description: 'Save ₦5,000 on orders above ₦100,000',
    discountType: 'fixed',
    discountValue: 5000,
    minPurchaseAmount: 100000,
    usageLimit: 500,
    usagePerUser: 3,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  {
    code: 'FLASH50',
    description: 'Flash sale - 50% off',
    discountType: 'percentage',
    discountValue: 50,
    minPurchaseAmount: 20000,
    maxDiscountAmount: 50000,
    usageLimit: 100,
    usagePerUser: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
];

async function seedDatabase() {
  try {
    logger.info('🌱 Starting comprehensive database seeding...');

    // Connect to database
    await connectDB();

    // Clear existing data
    logger.info('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Category.deleteMany({}),
      VendorProfile.deleteMany({}),
      Coupon.deleteMany({}),
    ]);

    // Seed Categories
    logger.info('📁 Seeding categories...');
    const createdCategories = await Category.insertMany(categories);
    logger.info(`✅ Created ${createdCategories.length} categories`);

    // Seed Users
    logger.info('👥 Seeding users...');
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
      }))
    );
    const createdUsers = await User.insertMany(hashedUsers);
    logger.info(`✅ Created ${createdUsers.length} users`);

    // Find vendor users
    const vendors = createdUsers.filter((user) => user.role === 'vendor');

    // Seed Vendor Profiles with ratings
    logger.info('🏪 Seeding vendor profiles with ratings...');
    const vendorProfilesWithUsers = vendorProfiles.map((profile, index) => ({
      ...profile,
      user: vendors[index]._id,
      businessAddress: {
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        zipCode: '100001',
      },
      businessPhone: '+234 800 000 0000',
      businessEmail: vendors[index].email,
    }));
    const createdVendorProfiles = await VendorProfile.insertMany(vendorProfilesWithUsers);
    logger.info(`✅ Created ${createdVendorProfiles.length} vendor profiles with ratings`);

    // Combine all products
    const allProducts = [...physicalProducts, ...digitalProducts];

    // Seed Products with ratings, features and specifications
    logger.info('📦 Seeding 40 products (20 physical + 20 digital) with keyFeatures and specifications...');
    const productsWithRefs = allProducts.map((product, index) => ({
      ...product,
      vendor: vendors[index % vendors.length]._id,
      category: createdCategories[index % createdCategories.length]._id,
      slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    }));
    const createdProducts = await Product.insertMany(productsWithRefs);
    logger.info(`✅ Created ${createdProducts.length} products with features and specifications`);
    logger.info(`   - Physical products: ${physicalProducts.length}`);
    logger.info(`   - Digital products: ${digitalProducts.length}`);

    // 🔥 UPDATE PRODUCT COUNTS FOR EACH CATEGORY 🔥
    logger.info('📊 Updating category product counts...');

    // Group products by category and count them
    const categoryProductCounts = createdProducts.reduce((acc: any, product: any) => {
      const categoryId = product.category.toString();
      acc[categoryId] = (acc[categoryId] || 0) + 1;
      return acc;
    }, {});

    // Update each category with its product count
    for (const [categoryId, count] of Object.entries(categoryProductCounts)) {
      await Category.findByIdAndUpdate(categoryId, { productCount: count });
      const category = await Category.findById(categoryId);
      logger.info(`   ✅ ${category?.name}: ${count} products`);
    }

    logger.info('✅ Category product counts updated');

    // Seed Coupons
    logger.info('🎟️  Seeding coupons...');
    const createdCoupons = await Coupon.insertMany(coupons);
    logger.info(`✅ Created ${createdCoupons.length} coupons`);

    // Summary
    logger.info('\n✨ Database seeding completed successfully!\n');
    logger.info('📊 Summary:');
    logger.info(`   - Categories: ${createdCategories.length}`);
    logger.info(`   - Users: ${createdUsers.length}`);
    logger.info(`   - Vendor Profiles: ${createdVendorProfiles.length} (with ratings)`);
    logger.info(`   - Products: ${createdProducts.length} (with ratings, features & specs)`);
    logger.info(`   - Coupons: ${createdCoupons.length}`);
    
    logger.info('\n👤 Test Accounts:');
    logger.info('   Admin:    admin@vendorspot.com / Admin123!');
    logger.info('   Vendor 1: vendor@vendorspot.com / Vendor123!');
    logger.info('   Vendor 2: vendor2@vendorspot.com / Vendor123!');
    logger.info('   Vendor 3: vendor3@vendorspot.com / Vendor123!');
    logger.info('   Vendor 4: vendor4@vendorspot.com / Vendor123!');
    logger.info('   Customer: customer@vendorspot.com / Customer123!');
    
    logger.info('\n🏪 Vendor Profiles with Ratings:');
    logger.info("   Jane's Electronics Hub     - 4.9⭐ (500 reviews, 1,250 sales)");
    logger.info("   Fashion Forward by Sarah   - 4.8⭐ (380 reviews, 890 sales)");
    logger.info("   David's Home Store         - 4.7⭐ (250 reviews, 420 sales)");
    logger.info("   Emma's Digital Academy     - 4.9⭐ (620 reviews, 1,850 sales)");
    
    logger.info('\n🎟️  Test Coupons:');
    logger.info('   WELCOME20 - 20% off (min ₦50k)');
    logger.info('   SAVE5K    - ₦5,000 off (min ₦100k)');
    logger.info('   FLASH50   - 50% off (min ₦20k)');
    
    logger.info('\n📦 Products Created:');
    logger.info('   - 20 Physical products (with stock, ratings, features & specs)');
    logger.info('   - 20 Digital products (courses, templates, e-books, features & specs)');
    logger.info('   - All products have ratings (4.3-4.9 stars)');
    logger.info('   - All products have reviews (120-620 reviews)');
    logger.info('   - All products have keyFeatures (3-5 bullet points)');
    logger.info('   - All products have specifications (8-10 key-value pairs)');
    
    logger.info('\n📊 Category Product Counts:');
    for (const category of createdCategories) {
      const updated = await Category.findById(category._id);
      logger.info(`   - ${updated?.name}: ${updated?.productCount} products`);
    }
    
    logger.info('\n🖼️  All images use picsum.photos for compatibility');
    logger.info('✅ Ready to fetch top vendors by rating, sales, or products!');
    logger.info('✅ Ready to display full product details with features and specifications!');
    logger.info('✅ Category product counts are now accurate!');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeder
seedDatabase();
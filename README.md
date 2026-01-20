# VendorSpot Backend API

A comprehensive e-commerce marketplace platform built with MERN stack (MongoDB, Express.js, React Native, Node.js) and TypeScript.

## 🚀 Features

### Phase 1: Core Marketplace ✅
- ✅ User authentication (Register, Login, Email Verification, Password Reset)
- ✅ Role-based access control (Customer, Vendor, Admin, Super Admin, Affiliate)
- ✅ Product management (CRUD operations)
- ✅ Category and subcategory management
- ✅ Search and filtering

### Phase 2: Payments + Logistics (Ready for Integration)
- 💳 Paystack payment gateway integration
- 📦 ShipBubble logistics API integration
- 🛒 Shopping cart functionality
- 📋 Order management system
- 💰 Wallet system with transactions

### Phase 3: Vendor Tools
- 👔 Vendor profiles and KYC verification
- 📊 Vendor dashboard with analytics
- 📦 Inventory management
- ✅ Order fulfillment
- 💸 Payout and withdrawal system

### Phase 4: Gamification + Affiliates
- 🎯 Affiliate marketing system
- 🏆 Challenge and reward system
- ⭐ Points and badges
- 📈 Leaderboards

### Phase 5: Digital Products
- 📱 Digital product marketplace
- 🔐 Secure file delivery
- 📜 License management
- 📚 Digital library

### Phase 6: Advanced Features
- 💬 In-app chat system
- ⭐ Reviews and ratings
- ❤️ Wishlist
- 🔔 Push notifications (FCM)
- 📧 Email notifications
- 📊 Advanced analytics

## 🛠 Technology Stack

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: Paystack API
- **Logistics**: ShipBubble API
- **Email**: Nodemailer
- **Logging**: Winston
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js v16 or higher
- MongoDB v5 or higher
- npm or yarn package manager

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd vendorspot-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- JWT secrets
- Email credentials (SMTP)
- Paystack API keys
- ShipBubble API key
- Cloudinary credentials (for file uploads)
- Firebase credentials (for push notifications)

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas cloud database
```

5. **Run the application**

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint TypeScript files

## 📁 Project Structure

```
vendorspot-backend/
├── src/
│   ├── config/          # Configuration files
│   │   └── database.ts  # Database connection
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.ts
│   │   ├── product.controller.ts
│   │   └── ...
│   ├── middleware/      # Custom middleware
│   │   ├── auth.ts      # Authentication middleware
│   │   ├── error.ts     # Error handling
│   │   └── validation.ts
│   ├── models/          # Mongoose models
│   │   ├── User.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── ...
│   ├── routes/          # API routes
│   │   ├── auth.routes.ts
│   │   ├── product.routes.ts
│   │   └── index.ts
│   ├── services/        # Business logic & external APIs
│   │   ├── paystack.service.ts
│   │   └── shipbubble.service.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   ├── email.ts
│   │   ├── helpers.ts
│   │   ├── jwt.ts
│   │   └── logger.ts
│   └── server.ts        # App entry point
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json        # TypeScript configuration
└── README.md
```

## 🔑 API Endpoints

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/verify-email` - Verify email with OTP
- `POST /auth/resend-otp` - Resend OTP code
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/me` - Get current user (Auth required)
- `PUT /auth/profile` - Update profile (Auth required)
- `PUT /auth/change-password` - Change password (Auth required)

### Products
- `GET /products` - Get all products (with pagination & filters)
- `GET /products/:id` - Get single product
- `POST /products` - Create product (Vendor/Admin only)
- `PUT /products/:id` - Update product (Vendor/Admin only)
- `DELETE /products/:id` - Delete product (Vendor/Admin only)

### Coming Soon
- Orders, Cart, Payments, Reviews, Chat, and more...

## 📖 API Documentation

Comprehensive API documentation is available in:
- `API_DOCUMENTATION.md` - Detailed endpoint documentation
- `vendorspot-postman-collection.json` - Postman collection for testing

### Testing with Postman

1. Import `vendorspot-postman-collection.json` into Postman
2. Set the `baseUrl` variable to your API URL
3. Follow the test flow:
   - Register → Verify Email → Login
   - Use the access token for authenticated requests

## 🔐 User Roles

| Role | Permissions |
|------|-------------|
| **CUSTOMER** | Browse products, make purchases, write reviews |
| **VENDOR** | Sell products, manage inventory, fulfill orders |
| **AFFILIATE** | Share products, earn commissions |
| **ADMIN** | Moderate content, manage users, view analytics |
| **SUPER_ADMIN** | Full system access, manage admins |

## 💳 Payment Integration (Paystack)

The system is integrated with Paystack for secure payments:
- Initialize payment transactions
- Verify payment status
- Handle webhooks
- Process refunds
- Manage transfers to vendors

## 📦 Logistics Integration (ShipBubble)

Integrated with ShipBubble for delivery management:
- Get delivery quotes
- Create shipments
- Track deliveries
- Manage couriers

## 🔔 Push Notifications (Firebase)

Push notifications via Firebase Cloud Messaging:
- Order updates
- Payment confirmations
- Promotions and offers
- Chat messages

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Helmet.js for security headers
- Input validation and sanitization
- CORS configuration
- MongoDB injection prevention

## 📊 Database Models

- **User** - User accounts and profiles
- **VendorProfile** - Vendor business information
- **Product** - Product catalog
- **Category** - Product categories
- **Cart** - Shopping cart
- **Order** - Order management
- **Wallet** - User wallet and transactions
- **Review** - Product reviews
- **Coupon** - Discount coupons
- **AffiliateLink** - Affiliate marketing
- **Challenge** - Gamification challenges
- **Notification** - System notifications
- **ChatMessage** - In-app messaging
- **Wishlist** - User wishlists

## 🚀 Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the project
npm run build

# Start with PM2
pm2 start dist/server.js --name vendorspot-api

# View logs
pm2 logs vendorspot-api

# Monitor
pm2 monit
```

### Using Docker

```bash
# Build image
docker build -t vendorspot-api .

# Run container
docker run -p 5000:5000 --env-file .env vendorspot-api
```

### Environment Variables in Production

Ensure all production environment variables are properly set:
- Use strong JWT secrets
- Configure production database
- Set up production email service
- Add production API keys (Paystack, ShipBubble)
- Configure CORS for your frontend domain

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Sharp**  
Email: support@vendorspot.com  
Location: First Gate, Ikorodu, Lagos State, Nigeria

## 🙏 Acknowledgments

- Paystack for payment processing
- ShipBubble for logistics
- MongoDB for database
- Express.js community
- TypeScript team

---

**Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: January 2026

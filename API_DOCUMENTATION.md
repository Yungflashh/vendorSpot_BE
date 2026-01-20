# VendorSpot Backend API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Development Phases](#development-phases)

## Overview

VendorSpot is a comprehensive e-commerce marketplace platform built with the MERN stack (MongoDB, Express.js, React Native, Node.js) and TypeScript.

### Technology Stack
- **Backend Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Payment Gateway**: Paystack
- **Logistics**: ShipBubble API
- **Email**: Nodemailer
- **File Storage**: Cloudinary (recommended)
- **Push Notifications**: Firebase Cloud Messaging

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

## Getting Started

### Prerequisites
- Node.js v16 or higher
- MongoDB v5 or higher
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd vendorspot-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start MongoDB
```bash
mongod
```

5. Run the application
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Environment Variables

See `.env.example` for all required environment variables.

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

### User Roles
- **CUSTOMER**: Regular buyers
- **VENDOR**: Sellers/merchants
- **ADMIN**: Platform administrators
- **SUPER_ADMIN**: System administrators
- **AFFILIATE**: Affiliate marketers

## API Endpoints

### Authentication Endpoints

#### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123",
  "role": "customer"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "user_id_here",
    "email": "john@example.com"
  }
}
```

#### 2. Verify Email
**POST** `/auth/verify-email`

Verify email address with OTP code.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "role": "customer"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### 3. Login
**POST** `/auth/login`

Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+2348012345678",
      "role": "customer",
      "avatar": "avatar_url"
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### 4. Resend OTP
**POST** `/auth/resend-otp`

Resend verification OTP to email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### 5. Forgot Password
**POST** `/auth/forgot-password`

Request password reset link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### 6. Reset Password
**POST** `/auth/reset-password`

Reset password with token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123"
}
```

#### 7. Refresh Token
**POST** `/auth/refresh-token`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

#### 8. Get Current User
**GET** `/auth/me`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+2348012345678",
      "role": "customer",
      "status": "active",
      "avatar": "avatar_url",
      "addresses": [],
      "emailVerified": true,
      "phoneVerified": false,
      "isAffiliate": false
    }
  }
}
```

#### 9. Update Profile
**PUT** `/auth/profile`

Update user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+2348012345678",
  "avatar": "new_avatar_url"
}
```

#### 10. Change Password
**PUT** `/auth/change-password`

Change user password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

---

### Product Endpoints

#### 1. Get All Products
**GET** `/products`

Get list of products with pagination and filters.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page
- `category` (string, optional): Filter by category ID
- `vendor` (string, optional): Filter by vendor ID
- `productType` (string, optional): Filter by type (physical/digital)
- `search` (string, optional): Search query
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter
- `sort` (string, optional): Sort field (price, createdAt, rating)
- `order` (string, optional): Sort order (asc/desc)

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "product_id",
        "name": "Product Name",
        "slug": "product-name",
        "description": "Product description",
        "vendor": {
          "_id": "vendor_id",
          "firstName": "Vendor",
          "lastName": "Name"
        },
        "category": {
          "_id": "category_id",
          "name": "Category Name"
        },
        "price": 25000,
        "compareAtPrice": 30000,
        "images": ["image_url_1", "image_url_2"],
        "status": "active",
        "quantity": 100,
        "averageRating": 4.5,
        "totalReviews": 10
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### 2. Get Single Product
**GET** `/products/:id`

Get detailed product information.

**Response:** (200 OK)
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "product_id",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Detailed product description",
      "shortDescription": "Short description",
      "vendor": {
        "_id": "vendor_id",
        "firstName": "Vendor",
        "lastName": "Name",
        "email": "vendor@example.com"
      },
      "category": {
        "_id": "category_id",
        "name": "Category Name"
      },
      "productType": "physical",
      "price": 25000,
      "compareAtPrice": 30000,
      "sku": "SKU-12345",
      "quantity": 100,
      "images": ["image_url_1", "image_url_2"],
      "variants": [],
      "tags": ["tag1", "tag2"],
      "status": "active",
      "isFeatured": false,
      "isAffiliate": true,
      "affiliateCommission": 10,
      "averageRating": 4.5,
      "totalReviews": 10,
      "views": 150
    }
  }
}
```

#### 3. Create Product (Vendor/Admin Only)
**POST** `/products`

Create a new product.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "shortDescription": "Short description",
  "category": "category_id",
  "productType": "physical",
  "price": 25000,
  "compareAtPrice": 30000,
  "quantity": 100,
  "images": ["image_url_1", "image_url_2"],
  "tags": ["tag1", "tag2"],
  "weight": 1.5,
  "dimensions": {
    "length": 10,
    "width": 5,
    "height": 3
  }
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product": { ... }
  }
}
```

#### 4. Update Product (Vendor/Admin Only)
**PUT** `/products/:id`

Update existing product.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:** (Same as Create Product)

#### 5. Delete Product (Vendor/Admin Only)
**DELETE** `/products/:id`

Delete a product.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** (200 OK)
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### Common HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate email)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## Development Phases

### Phase 1: Core Marketplace ✅
- User authentication (register, login, verify, reset password)
- User roles and permissions
- Product management (CRUD)
- Category management
- Basic search and filtering

### Phase 2: Payments + Logistics (In Progress)
- Paystack payment integration
- ShipBubble delivery integration
- Order management
- Cart functionality
- Wallet system

### Phase 3: Vendor Tools
- Vendor profile and KYC
- Vendor dashboard and analytics
- Inventory management
- Order fulfillment
- Payout system

### Phase 4: Gamification + Affiliates
- Affiliate system
- Challenge system
- Points and rewards
- Leaderboards

### Phase 5: Digital Products
- Digital product uploads
- Secure file delivery
- License management
- Digital library

### Phase 6: Advanced Features
- In-app chat
- Reviews and ratings
- Wishlist
- Notifications (push, email, in-app)
- Advanced analytics

---

## API Testing

Use the provided Postman collection (`vendorspot-postman-collection.json`) for testing all endpoints.

### Quick Test Flow

1. **Register**: POST `/auth/register`
2. **Verify Email**: POST `/auth/verify-email` (use OTP from console/email)
3. **Login**: POST `/auth/login` (save access token)
4. **Get Profile**: GET `/auth/me` (with token)
5. **Create Product**: POST `/products` (with token, as vendor)
6. **Get Products**: GET `/products`

---

## Support

For issues or questions:
- Email: support@vendorspot.com
- Documentation: https://docs.vendorspot.com

---

**Version**: 1.0.0  
**Last Updated**: January 2026

# Phase 3: Vendor Tools - API Documentation

## ✅ Implemented Features

### 1. Vendor Profile Management
- Create vendor profile
- Update profile information
- Upload business logo/banner
- Manage storefront customization
- Social media integration

### 2. KYC Verification System
- Upload verification documents
- Document status tracking
- Admin verification workflow
- Rejection with reasons

### 3. Vendor Dashboard & Analytics
- Comprehensive dashboard overview
- Sales analytics with date ranges
- Revenue tracking
- Order statistics
- Product performance metrics
- Inventory alerts

### 4. Payout Management
- Bank account setup
- Payout details management
- Commission tracking
- Revenue calculations

### 5. Category Management
- Hierarchical categories
- Subcategory support
- Category tree view
- Product count tracking

### 6. Coupon System
- Create discount coupons
- Percentage & fixed discounts
- Usage limits
- Date range validation
- Product/category specific coupons

---

## 🏪 Vendor API Endpoints

### Create Vendor Profile
```
POST /api/v1/vendor/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "Sharp Electronics",
  "businessDescription": "Premium gadgets and electronics",
  "businessAddress": {
    "street": "123 Tech Avenue",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria"
  },
  "businessPhone": "+2348012345678",
  "businessEmail": "contact@sharpelectronics.com",
  "businessWebsite": "https://sharpelectronics.com"
}
```

### Get Vendor Profile
```
GET /api/v1/vendor/profile
Authorization: Bearer <token>
```

### Update Vendor Profile
```
PUT /api/v1/vendor/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessDescription": "Updated description",
  "businessLogo": "https://cloudinary.com/logo.png",
  "storefront": {
    "theme": "modern",
    "bannerImages": ["banner1.jpg", "banner2.jpg"],
    "customMessage": "Welcome to our store!"
  },
  "socialMedia": {
    "facebook": "facebook.com/sharpelectronics",
    "instagram": "@sharpelectronics",
    "twitter": "@sharp_tech"
  }
}
```

### Upload KYC Documents
```
POST /api/v1/vendor/kyc/upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "documents": [
    {
      "type": "CAC",
      "documentUrl": "https://cloudinary.com/cac-certificate.pdf"
    },
    {
      "type": "ID_CARD",
      "documentUrl": "https://cloudinary.com/national-id.jpg"
    }
  ]
}
```

**Document Types:**
- `CAC` - Corporate Affairs Commission
- `ID_CARD` - National ID Card
- `PASSPORT` - International Passport
- `DRIVERS_LICENSE` - Driver's License
- `UTILITY_BILL` - Utility Bill

### Update Payout Details
```
PUT /api/v1/vendor/payout-details
Authorization: Bearer <token>
Content-Type: application/json

{
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "accountName": "Sharp Electronics Ltd",
  "bankCode": "058"
}
```

### Get Vendor Dashboard
```
GET /api/v1/vendor/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProducts": 45,
      "activeProducts": 42,
      "totalOrders": 156,
      "ordersThisMonth": 32,
      "ordersThisWeek": 8,
      "totalRevenue": 5600000,
      "revenueThisMonth": 1200000,
      "revenueThisWeek": 280000,
      "netRevenue": 5320000,
      "platformFee": 280000,
      "commissionRate": 5,
      "averageRating": 4.5,
      "totalReviews": 89
    },
    "topProducts": [...],
    "recentOrders": [...],
    "inventory": {
      "lowStockProducts": [...],
      "outOfStockProducts": [...],
      "lowStockCount": 5,
      "outOfStockCount": 2
    },
    "profile": {
      "verificationStatus": "verified",
      "isActive": true,
      "hasPayoutDetails": true
    }
  }
}
```

### Get Sales Analytics
```
GET /api/v1/vendor/analytics?period=30days
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `7days` | `30days` | `90days` | `1year`

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30days",
    "summary": {
      "totalOrders": 32,
      "totalRevenue": 1200000,
      "averageOrderValue": 37500
    },
    "salesByDate": [
      {
        "date": "2026-01-01",
        "orders": 3,
        "revenue": 105000
      },
      ...
    ],
    "topSellingProducts": [
      {
        "productId": "...",
        "name": "iPhone 15 Pro",
        "quantity": 12,
        "revenue": 450000
      },
      ...
    ]
  }
}
```

### Get Public Vendor Profile
```
GET /api/v1/vendor/public/:vendorId
```

No authentication required - for customers to view vendor storefront.

---

## 📁 Category API Endpoints

### Get All Categories
```
GET /api/v1/categories
```

**Query Parameters:**
- `parent`: Filter by parent category ID (`null` for root categories)
- `level`: Filter by level (0, 1, 2, etc.)

### Get Category Tree
```
GET /api/v1/categories/tree
```

Returns hierarchical structure of all categories with subcategories.

### Get Single Category
```
GET /api/v1/categories/:slug
```

Returns category with its subcategories.

### Create Category (Admin Only)
```
POST /api/v1/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Electronics",
  "description": "Electronic devices and gadgets",
  "image": "https://cloudinary.com/electronics.jpg",
  "icon": "electronics-icon.svg",
  "parent": null
}
```

### Update Category (Admin Only)
```
PUT /api/v1/categories/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "order": 1,
  "isActive": true
}
```

### Delete Category (Admin Only)
```
DELETE /api/v1/categories/:id
Authorization: Bearer <token>
```

---

## 🎟️ Coupon API Endpoints

### Validate Coupon (Public)
```
GET /api/v1/coupons/validate/:code
```

Optional authentication - better validation if user is logged in.

**Response:**
```json
{
  "success": true,
  "message": "Coupon is valid",
  "data": {
    "valid": true,
    "coupon": {
      "code": "SAVE20",
      "description": "20% off all products",
      "discountType": "percentage",
      "discountValue": 20,
      "minPurchase": 10000,
      "maxDiscount": 50000
    }
  }
}
```

### Create Coupon (Admin Only)
```
POST /api/v1/coupons
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SAVE20",
  "description": "20% off all products",
  "discountType": "percentage",
  "discountValue": 20,
  "minPurchase": 10000,
  "maxDiscount": 50000,
  "usageLimit": 100,
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2026-12-31T23:59:59Z",
  "applicableProducts": [],
  "applicableCategories": [],
  "excludedProducts": []
}
```

**Discount Types:**
- `percentage`: e.g., 20% off
- `fixed`: e.g., ₦5,000 off

### Get All Coupons (Admin Only)
```
GET /api/v1/coupons?page=1&limit=20&isActive=true
Authorization: Bearer <token>
```

### Get Single Coupon (Admin Only)
```
GET /api/v1/coupons/:id
Authorization: Bearer <token>
```

### Get Coupon Statistics (Admin Only)
```
GET /api/v1/coupons/:id/stats
Authorization: Bearer <token>
```

### Update Coupon (Admin Only)
```
PUT /api/v1/coupons/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "discountValue": 25,
  "usageLimit": 200,
  "isActive": true
}
```

### Delete Coupon (Admin Only)
```
DELETE /api/v1/coupons/:id
Authorization: Bearer <token>
```

---

## 👨‍💼 Admin Vendor Management

### Get All Vendors
```
GET /api/v1/vendor/admin/all?page=1&limit=20
Authorization: Bearer <token> (Admin/Super Admin)
```

**Query Parameters:**
- `verificationStatus`: `pending` | `verified` | `rejected`
- `isActive`: `true` | `false`

### Verify Vendor KYC
```
PUT /api/v1/vendor/admin/verify/:vendorId
Authorization: Bearer <token> (Admin/Super Admin)
Content-Type: application/json

{
  "status": "verified"
}
```

OR reject with reason:
```json
{
  "status": "rejected",
  "rejectionReason": "Invalid documents provided"
}
```

### Toggle Vendor Status
```
PUT /api/v1/vendor/admin/toggle-status/:vendorId
Authorization: Bearer <token> (Admin/Super Admin)
```

Activates if inactive, deactivates if active.

---

## 💡 Usage Examples

### Complete Vendor Onboarding Flow

1. **Create Vendor Profile**
```bash
curl -X POST http://localhost:5000/api/v1/vendor/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Sharp Electronics",
    "businessAddress": {...},
    "businessPhone": "+2348012345678",
    "businessEmail": "contact@sharp.com"
  }'
```

2. **Upload KYC Documents**
```bash
curl -X POST http://localhost:5000/api/v1/vendor/kyc/upload \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "documents": [
      {"type": "CAC", "documentUrl": "..."},
      {"type": "ID_CARD", "documentUrl": "..."}
    ]
  }'
```

3. **Add Payout Details**
```bash
curl -X PUT http://localhost:5000/api/v1/vendor/payout-details \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bankName": "GTBank",
    "accountNumber": "0123456789",
    "accountName": "Sharp Electronics",
    "bankCode": "058"
  }'
```

4. **Wait for Admin Verification**

5. **Start Selling!**

### View Dashboard Analytics

```bash
curl http://localhost:5000/api/v1/vendor/dashboard \
  -H "Authorization: Bearer <token>"
```

### Create Product Categories

```bash
# Create main category
curl -X POST http://localhost:5000/api/v1/categories \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices",
    "parent": null
  }'

# Create subcategory
curl -X POST http://localhost:5000/api/v1/categories \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smartphones",
    "description": "Mobile phones",
    "parent": "electronics_category_id"
  }'
```

---

## 📊 Vendor Dashboard Metrics

The dashboard provides comprehensive insights:

### Overview Metrics
- Total/Active products
- Order counts (all-time, month, week)
- Revenue (all-time, month, week)
- Net revenue after platform fees
- Average rating & total reviews

### Performance
- Top 5 selling products
- Recent 10 orders
- Low stock alerts
- Out of stock items

### Financial
- Commission rate
- Platform fees paid
- Net earnings
- Payout readiness status

---

## 🎯 Verification Flow

```
Vendor Registers → Creates Profile → Uploads KYC → 
Admin Reviews → Approved/Rejected → 
If Approved: Can Sell → Add Payout Details → Earn & Withdraw
```

**KYC Verification Statuses:**
- `pending` - Awaiting admin review
- `verified` - Approved, can sell
- `rejected` - Denied, re-upload required

---

## ⚠️ Important Notes

1. **Vendor Profile:**
   - Must be created before becoming a vendor
   - User role automatically changed to `vendor`
   - Cannot create if profile already exists

2. **KYC Requirements:**
   - At least one valid document required
   - Documents must be clear and readable
   - Admin verification required before selling

3. **Commission Structure:**
   - Default platform fee: 5%
   - Calculated on gross revenue
   - Deducted before payouts

4. **Categories:**
   - Maximum 3 levels deep
   - Cannot delete categories with products
   - Cannot delete categories with subcategories

5. **Coupons:**
   - Codes are case-insensitive
   - One-time use per user
   - Checked against minimum purchase
   - Can be product/category specific

---

## 🚀 Next Steps (Phase 4)

- Affiliate marketing system
- Gamification & challenges
- Points & rewards
- Leaderboards
- Badge system

---

**Phase 3 Status**: ✅ Complete  
**Last Updated**: January 2026

# Phase 5: Digital Products - API Documentation

## ✅ Implemented Features

### 1. Digital Product Management
- Upload digital files
- Version tracking
- File metadata management
- Digital product analytics

### 2. License Key System
- Generate license keys
- Activate licenses
- Verify license validity
- Deactivate licenses
- License expiry management
- Device tracking

### 3. Secure Downloads
- Temporary download tokens
- Token expiration (1 hour)
- Download link generation
- File access control

### 4. Digital Product Delivery
- Automatic delivery on purchase
- User digital library
- Purchase history
- Download management

---

## 📦 Digital Product API Endpoints

### Upload Digital File (Vendor)
```
POST /api/v1/digital/upload/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "fileUrl": "https://cloudinary.com/files/product.zip",
  "fileName": "my-software-v1.0.0.zip",
  "fileSize": 52428800,
  "fileType": "application/zip",
  "version": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Digital file uploaded successfully",
  "data": {
    "product": {
      "_id": "...",
      "name": "Premium Software",
      "digitalFile": {
        "url": "...",
        "fileName": "my-software-v1.0.0.zip",
        "fileSize": 52428800,
        "fileType": "application/zip",
        "version": "1.0.0",
        "uploadedAt": "2026-01-08T..."
      }
    }
  }
}
```

### Get My Digital Products
```
GET /api/v1/digital/my-products
Authorization: Bearer <token>
```

Returns all digital products purchased by the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "digitalProducts": [
      {
        "orderId": "...",
        "orderNumber": "VS20260108001",
        "itemId": "...",
        "product": {
          "id": "...",
          "name": "Premium Software",
          "slug": "premium-software",
          "image": "...",
          "type": "digital",
          "version": "1.0.0",
          "requiresLicense": true
        },
        "purchasedAt": "2026-01-08T..."
      }
    ]
  }
}
```

### Get Download Link
```
GET /api/v1/digital/download-link/:orderId/:itemId
Authorization: Bearer <token>
```

Generates a secure, temporary download link.

**Response:**
```json
{
  "success": true,
  "message": "Download link generated",
  "data": {
    "downloadUrl": "https://api.vendorspot.com/api/v1/digital/download/abc123...",
    "expiresAt": "2026-01-08T13:00:00Z",
    "fileName": "premium-software-v1.0.0.zip",
    "fileSize": 52428800,
    "version": "1.0.0"
  }
}
```

**Important:** Download link expires in 1 hour.

### Process Download
```
GET /api/v1/digital/download/:token
```

Downloads the file using the temporary token.

---

## 🔑 License Key API Endpoints

### Generate License Key (Vendor/Admin)
```
POST /api/v1/digital/license/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_id_here",
  "itemId": "item_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "License key generated successfully",
  "data": {
    "license": {
      "key": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
      "userId": "...",
      "orderId": "...",
      "activatedAt": null,
      "expiresAt": null,
      "isActive": true,
      "deviceInfo": null
    }
  }
}
```

**License Key Format:** 5 segments of 5 characters (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX)

### Activate License
```
POST /api/v1/digital/license/activate
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "deviceName": "John's MacBook Pro",
    "os": "macOS 14.0",
    "appVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "License activated successfully",
  "data": {
    "license": {
      "key": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
      "activatedAt": "2026-01-08T12:00:00Z",
      "expiresAt": null,
      "isActive": true
    },
    "product": {
      "id": "...",
      "name": "Premium Software",
      "version": "1.0.0"
    }
  }
}
```

### Get User's Licenses
```
GET /api/v1/digital/licenses
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "licenses": [
      {
        "productId": "...",
        "productName": "Premium Software",
        "productSlug": "premium-software",
        "licenseKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
        "activatedAt": "2026-01-08T12:00:00Z",
        "expiresAt": null,
        "isActive": true
      }
    ]
  }
}
```

### Verify License (For Software)
```
POST /api/v1/digital/license/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
  "productId": "product_id_here"
}
```

**Response (Valid):**
```json
{
  "success": true,
  "message": "License is valid",
  "data": {
    "valid": true,
    "license": {
      "key": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
      "activatedAt": "2026-01-08T12:00:00Z",
      "expiresAt": null
    },
    "product": {
      "name": "Premium Software",
      "version": "1.0.0"
    }
  }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "message": "Invalid license key",
  "data": {
    "valid": false
  }
}
```

### Deactivate License (Admin)
```
POST /api/v1/digital/license/deactivate
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY"
}
```

---

## 📊 Analytics API Endpoints

### Get Digital Product Analytics (Vendor)
```
GET /api/v1/digital/analytics/:productId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "...",
      "name": "Premium Software",
      "version": "1.0.0"
    },
    "sales": {
      "total": 150,
      "revenue": 4500000
    },
    "licenses": {
      "total": 150,
      "active": 145,
      "activated": 120,
      "activationRate": "80.00"
    }
  }
}
```

---

## 💡 Usage Examples

### Vendor: Upload Digital Product

```bash
# 1. Create digital product
curl -X POST http://localhost:5000/api/v1/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Software",
    "description": "Professional software for businesses",
    "price": 30000,
    "category": "software",
    "type": "digital",
    "requiresLicense": true,
    "licenseType": "lifetime"
  }'

# 2. Upload digital file
curl -X POST http://localhost:5000/api/v1/digital/upload/PRODUCT_ID \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://storage.com/file.zip",
    "fileName": "software-v1.0.0.zip",
    "fileSize": 52428800,
    "fileType": "application/zip",
    "version": "1.0.0"
  }'
```

### Customer: Purchase & Download

```bash
# 1. Purchase product (normal order flow)
# ... add to cart, checkout, pay ...

# 2. Get download link
curl http://localhost:5000/api/v1/digital/download-link/ORDER_ID/ITEM_ID \
  -H "Authorization: Bearer <token>"

# 3. Download file (browser or wget)
wget "https://api.vendorspot.com/api/v1/digital/download/TOKEN"
```

### Software: License Verification

```bash
# In your software, verify license on startup
curl -X POST http://localhost:5000/api/v1/digital/license/verify \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "ABCDE-FGHIJ-KLMNO-PQRST-UVWXY",
    "productId": "PRODUCT_ID"
  }'

# Check response:
# - valid: true → Allow software to run
# - valid: false → Block software
```

---

## 🔒 Security Features

### Download Security
- **Temporary tokens**: Expire after 1 hour
- **One-time use**: Each request generates new token
- **User verification**: Must own the product
- **Payment verification**: Order must be paid

### License Security
- **Unique keys**: 25-character format (5 segments)
- **User binding**: Tied to specific user
- **Order verification**: Linked to paid order
- **Device tracking**: Optional device information
- **Activation tracking**: Know when/where activated

---

## 📋 License Types

### 1. Lifetime License
- Never expires
- One-time purchase
- Permanent access
- Most common for software

### 2. Subscription License
- Annual renewal required
- Expires after 1 year
- Recurring payment
- Good for SaaS products

### 3. Trial License
- Limited time (e.g., 30 days)
- Demo/evaluation purposes
- Can upgrade to paid

---

## 🎯 Integration Notes

### Automatic Features

**On Purchase:**
1. Order completed
2. License auto-generated (if required)
3. Customer notified
4. Download link available immediately

**Download Process:**
1. Customer requests download link
2. System validates ownership
3. Temporary token generated
4. Link expires in 1 hour
5. Customer downloads file

### License Activation Flow

```
Purchase → Generate License → 
Customer Receives Key → 
Install Software → 
Activate License → 
Verify Periodically
```

---

## ⚠️ Important Notes

1. **Digital Files:**
   - Upload to secure cloud storage (S3, Cloudinary)
   - Store URL, not actual file
   - Version all releases
   - Keep backups

2. **Download Links:**
   - Expire in 1 hour
   - Generate new link if expired
   - Track download attempts
   - Monitor unusual activity

3. **License Keys:**
   - Unique per purchase
   - Cannot be transferred
   - One license per order item
   - Store securely

4. **File Storage:**
   - Use CDN for faster downloads
   - Enable compression
   - Limit file size (recommend <500MB)
   - Support resume downloads

5. **License Verification:**
   - Verify on software startup
   - Periodic checks (daily/weekly)
   - Handle offline mode
   - Cache validation results

---

## 🚀 Next Steps (Phase 6)

- Review system enhancements
- Chat/messaging system
- Advanced search & filters
- Wishlist functionality
- Social features

---

**Phase 5 Status**: ✅ Complete  
**Last Updated**: January 2026

# Phase 2: Payments + Logistics - API Documentation

## ✅ Implemented Features

### 1. Shopping Cart System
- Add items to cart
- Update quantities
- Remove items
- Apply/remove coupons
- Clear cart
- Get cart summary

### 2. Order Management
- Create orders from cart
- Payment processing (Paystack & Wallet)
- Order tracking
- Cancel orders with refunds
- Vendor order management
- Order status updates

### 3. Wallet System
- View wallet balance
- Transaction history
- Top-up wallet (Paystack)
- Request withdrawals
- Internal fund transfers
- Admin withdrawal processing

### 4. Payment Integration
- Paystack payment initialization
- Payment verification
- Webhook handling
- Automatic refunds

---

## 🛒 Cart API Endpoints

### Get Cart
```
GET /api/v1/cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "items": [
        {
          "product": {...},
          "quantity": 2,
          "price": 25000
        }
      ],
      "subtotal": 50000,
      "discount": 5000,
      "total": 45000
    }
  }
}
```

### Add to Cart
```
POST /api/v1/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 2,
  "variant": "size-large"
}
```

### Update Cart Item
```
PUT /api/v1/cart/items/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

### Remove from Cart
```
DELETE /api/v1/cart/items/:itemId
Authorization: Bearer <token>
```

### Apply Coupon
```
POST /api/v1/cart/coupon/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "SAVE20"
}
```

### Clear Cart
```
DELETE /api/v1/cart
Authorization: Bearer <token>
```

### Get Cart Summary
```
GET /api/v1/cart/summary
Authorization: Bearer <token>
```

---

## 📦 Order API Endpoints

### Create Order
```
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Lagos",
    "state": "Lagos",
    "country": "Nigeria",
    "zipCode": "100001"
  },
  "paymentMethod": "paystack",
  "notes": "Please deliver during business hours"
}
```

**Response (Paystack):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {...},
    "payment": {
      "authorization_url": "https://checkout.paystack.com/...",
      "access_code": "...",
      "reference": "VS20260108..."
    }
  }
}
```

### Get My Orders
```
GET /api/v1/orders/my-orders?page=1&limit=20
Authorization: Bearer <token>
```

### Get Single Order
```
GET /api/v1/orders/:orderId
Authorization: Bearer <token>
```

### Cancel Order
```
POST /api/v1/orders/:orderId/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "cancelReason": "Changed my mind"
}
```

### Verify Payment
```
GET /api/v1/orders/payment/verify/:reference
Authorization: Bearer <token>
```

### Get Vendor Orders (Vendor Only)
```
GET /api/v1/orders/vendor/orders?page=1&limit=20
Authorization: Bearer <token>
```

### Update Order Status (Vendor/Admin Only)
```
PUT /api/v1/orders/:orderId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "shipped"
}
```

**Valid statuses:**
- `pending`
- `confirmed`
- `processing`
- `shipped`
- `in_transit`
- `delivered`
- `cancelled`

---

## 💰 Wallet API Endpoints

### Get Wallet
```
GET /api/v1/wallet
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "balance": 50000,
      "totalEarned": 150000,
      "totalSpent": 80000,
      "totalWithdrawn": 20000,
      "pendingBalance": 5000,
      "transactions": [...]
    }
  }
}
```

### Get Wallet Summary
```
GET /api/v1/wallet/summary
Authorization: Bearer <token>
```

### Get Transactions
```
GET /api/v1/wallet/transactions?page=1&limit=50
Authorization: Bearer <token>
```

### Top-Up Wallet
```
POST /api/v1/wallet/top-up
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 10000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initialized",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "...",
    "reference": "TOPUP-..."
  }
}
```

### Verify Top-Up
```
GET /api/v1/wallet/top-up/verify/:reference
Authorization: Bearer <token>
```

### Request Withdrawal
```
POST /api/v1/wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000,
  "bankDetails": {
    "accountNumber": "0123456789",
    "bankCode": "058",
    "accountName": "John Doe"
  }
}
```

### Transfer Funds
```
POST /api/v1/wallet/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientEmail": "recipient@example.com",
  "amount": 1000,
  "description": "Payment for services"
}
```

### Process Withdrawal (Admin Only)
```
POST /api/v1/wallet/admin/process-withdrawal/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionId": "transaction_id_here",
  "status": "completed"
}
```

---

## 🔔 Webhook Endpoints

### Paystack Webhook
```
POST /api/v1/webhooks/paystack
Content-Type: application/json
x-paystack-signature: <signature>

{
  "event": "charge.success",
  "data": {...}
}
```

---

## 💡 Usage Examples

### Complete Purchase Flow

1. **Add items to cart**
```bash
curl -X POST http://localhost:5000/api/v1/cart/add \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product_id",
    "quantity": 2
  }'
```

2. **Apply coupon (optional)**
```bash
curl -X POST http://localhost:5000/api/v1/cart/coupon/apply \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE20"}'
```

3. **Create order**
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria"
    },
    "paymentMethod": "paystack"
  }'
```

4. **Complete payment**
- User redirects to Paystack checkout URL
- After payment, verify:
```bash
curl -X GET http://localhost:5000/api/v1/orders/payment/verify/ORDER_NUMBER \
  -H "Authorization: Bearer <token>"
```

### Wallet Top-Up Flow

1. **Initialize top-up**
```bash
curl -X POST http://localhost:5000/api/v1/wallet/top-up \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000}'
```

2. **Complete payment on Paystack**

3. **Verify top-up**
```bash
curl -X GET http://localhost:5000/api/v1/wallet/top-up/verify/REFERENCE \
  -H "Authorization: Bearer <token>"
```

---

## 🔐 Payment Methods

### 1. Paystack
- Credit/Debit cards
- Bank transfer
- USSD
- Mobile money

### 2. Wallet
- Pre-funded wallet balance
- Instant payment
- No transaction fees

### 3. Cash on Delivery (COD)
- Pay when you receive
- Limited availability
- Service fee may apply

---

## 📊 Order Status Flow

```
PENDING → CONFIRMED → PROCESSING → SHIPPED → IN_TRANSIT → DELIVERED
   ↓
CANCELLED (with refund if paid)
   ↓
FAILED (payment failed)
```

---

## ⚠️ Important Notes

1. **Minimum Amounts:**
   - Wallet top-up: ₦100
   - Wallet withdrawal: ₦1,000
   - Wallet transfer: ₦100

2. **Order Cancellation:**
   - Can only cancel PENDING or CONFIRMED orders
   - Refunds processed to wallet automatically
   - Takes 1-3 business days

3. **Payment Verification:**
   - Always verify payments after Paystack redirect
   - Check order status before fulfillment
   - Webhooks handle automatic verification

4. **Wallet Withdrawals:**
   - Processed within 1-3 business days
   - Requires bank account verification
   - Admin approval required

---

## 🚀 Next Steps (Phase 3)

- Vendor dashboard & analytics
- KYC verification
- Payout automation
- Advanced inventory management
- Bulk product uploads

---

**Phase 2 Status**: ✅ Complete  
**Last Updated**: January 2026

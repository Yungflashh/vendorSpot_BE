# Phase 4: Gamification + Affiliates - API Documentation

## ✅ Implemented Features

### 1. Affiliate Marketing System
- Activate affiliate accounts
- Generate product-specific affiliate links
- Generate general affiliate links
- Track clicks and conversions
- Comprehensive affiliate dashboard
- Earnings analytics
- Affiliate leaderboard

### 2. Challenge & Reward System
- Create challenges (buyer, seller, affiliate)
- Join active challenges
- Track progress automatically
- Claim rewards (cash/points)
- Challenge leaderboards
- Recurring challenges

### 3. Points & Rewards
- Earn points on purchases (1 point per ₦100)
- Redeem points for cash (1:1 ratio)
- Tier system (Bronze → Diamond)
- Badges & achievements
- Points leaderboard
- Automatic badge awards

### 4. Gamification Features
- User tiers based on points
- Badge collection system
- Achievements tracking
- Multiple leaderboards
- Competitive challenges

---

## 🤝 Affiliate API Endpoints

### Activate Affiliate Account
```
POST /api/v1/affiliate/activate
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Affiliate account activated successfully",
  "data": {
    "affiliateCode": "ABC123XY",
    "wallet": {
      "balance": 0
    }
  }
}
```

### Generate Product Affiliate Link
```
POST /api/v1/affiliate/generate-link
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Affiliate link generated successfully",
  "data": {
    "affiliateLink": {
      "id": "link_id",
      "code": "ABC123XY-IPHONE15",
      "url": "https://vendorspot.com/products/iphone-15?ref=ABC123XY-IPHONE15",
      "product": {
        "id": "...",
        "name": "iPhone 15 Pro",
        "price": 450000,
        "commission": 5
      },
      "clicks": 0,
      "conversions": 0,
      "totalEarned": 0
    }
  }
}
```

### Generate General Affiliate Link
```
POST /api/v1/affiliate/generate-general-link
Authorization: Bearer <token>
```

Returns a general link that works sitewide.

### Get Affiliate Dashboard
```
GET /api/v1/affiliate/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "affiliateCode": "ABC123XY",
      "totalClicks": 245,
      "totalConversions": 15,
      "totalEarnings": 67500,
      "conversionRate": "6.12",
      "availableBalance": 67500
    },
    "links": [...],
    "topPerformingLinks": [...],
    "recentConversions": [...]
  }
}
```

### Get Affiliate Earnings
```
GET /api/v1/affiliate/earnings?period=30days
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `7days` | `30days` | `90days` | `all`

### Get Affiliate Leaderboard
```
GET /api/v1/affiliate/leaderboard?period=30days&metric=earnings
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `7days` | `30days` | `all`
- `metric`: `earnings` | `conversions` | `clicks`

### Track Affiliate Click
```
GET /api/v1/affiliate/track/:code
```

Called when someone clicks an affiliate link.

---

## 🏆 Challenge API Endpoints

### Get Active Challenges
```
GET /api/v1/challenges/active
Authorization: Bearer <token>
```

Returns challenges relevant to user's role (buyer/seller/affiliate).

**Response:**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "_id": "...",
        "title": "First 10 Sales Challenge",
        "description": "Make 10 sales in 30 days",
        "type": "seller",
        "targetType": "sales",
        "targetValue": 10,
        "rewardType": "cash",
        "rewardValue": 5000,
        "startDate": "2026-01-01",
        "endDate": "2026-01-31",
        "userProgress": {
          "progress": 3,
          "completed": false
        }
      }
    ]
  }
}
```

### Get My Challenges
```
GET /api/v1/challenges/my-challenges
Authorization: Bearer <token>
```

Returns user's active and completed challenges.

### Join Challenge
```
POST /api/v1/challenges/:challengeId/join
Authorization: Bearer <token>
```

### Claim Reward
```
POST /api/v1/challenges/:challengeId/claim
Authorization: Bearer <token>
```

Requires challenge to be completed.

### Get Challenge Leaderboard
```
GET /api/v1/challenges/:challengeId/leaderboard
Authorization: Bearer <token>
```

Shows top 50 participants.

### Create Challenge (Admin Only)
```
POST /api/v1/challenges/admin/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Customer Challenge",
  "description": "Make your first 5 purchases",
  "type": "buyer",
  "targetType": "orders",
  "targetValue": 5,
  "rewardType": "points",
  "rewardValue": 500,
  "startDate": "2026-01-15T00:00:00Z",
  "endDate": "2026-02-15T23:59:59Z",
  "isRecurring": false
}
```

**Challenge Types:**
- `buyer` - For customers
- `seller` - For vendors
- `affiliate` - For affiliates

**Target Types:**
- `orders` - Number of orders
- `sales` - Sales amount
- `clicks` - Affiliate clicks
- `conversions` - Affiliate conversions

**Reward Types:**
- `cash` - Added to wallet
- `points` - Added to user points

---

## 🎁 Reward & Points API Endpoints

### Get User Points
```
GET /api/v1/rewards/points
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "points": 1250,
    "tier": "Gold",
    "pointsToNextTier": 750,
    "badges": ["first-purchase", "loyal-customer"],
    "achievements": ["completed-10-orders"]
  }
}
```

**Tier System:**
- **Bronze**: 0-499 points
- **Silver**: 500-1,999 points
- **Gold**: 2,000-4,999 points
- **Platinum**: 5,000-9,999 points
- **Diamond**: 10,000+ points

### Get Points History
```
GET /api/v1/rewards/points/history
Authorization: Bearer <token>
```

### Redeem Points for Cash
```
POST /api/v1/rewards/points/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "points": 500
}
```

**Conversion:** 100 points = ₦100  
**Minimum:** 100 points

**Response:**
```json
{
  "success": true,
  "message": "Points redeemed successfully",
  "data": {
    "pointsRedeemed": 500,
    "cashValue": 500,
    "remainingPoints": 750,
    "newBalance": 1500
  }
}
```

### Get Available Rewards
```
GET /api/v1/rewards/available
Authorization: Bearer <token>
```

Returns redeemable rewards based on user's points.

### Get Leaderboard
```
GET /api/v1/rewards/leaderboard?period=all-time&type=points
Authorization: Bearer <token>
```

**Query Parameters:**
- `period`: `all-time` | `30days` | `7days`
- `type`: `points`

---

## 📊 Gamification Features

### Badge System

**Available Badges:**
- `first-purchase` - Made first order
- `loyal-customer` - Completed 10 orders
- `vip-customer` - Completed 50 orders
- `high-spender` - Total spending > ₦100,000
- `review-master` - Left 10+ reviews

Badges are awarded automatically when conditions are met.

### Points Earning

**How to Earn Points:**
1. **Purchases**: 1 point per ₦100 spent
2. **Challenges**: Complete challenges for bonus points
3. **Referrals**: Refer friends (if enabled)
4. **Reviews**: Leave product reviews (if enabled)

### Leaderboards

**Available Leaderboards:**
1. **Points Leaderboard** - All-time or period-based
2. **Affiliate Leaderboard** - By earnings, conversions, or clicks
3. **Challenge Leaderboards** - Per challenge

All show top 50 users with rankings.

---

## 💡 Usage Examples

### Become an Affiliate

```bash
# 1. Activate affiliate account
curl -X POST http://localhost:5000/api/v1/affiliate/activate \
  -H "Authorization: Bearer <token>"

# 2. Generate link for product
curl -X POST http://localhost:5000/api/v1/affiliate/generate-link \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId": "product_id"}'

# 3. Share link: https://vendorspot.com/products/...?ref=ABC123XY-PRODUCT

# 4. Track performance
curl http://localhost:5000/api/v1/affiliate/dashboard \
  -H "Authorization: Bearer <token>"
```

### Complete a Challenge

```bash
# 1. View active challenges
curl http://localhost:5000/api/v1/challenges/active \
  -H "Authorization: Bearer <token>"

# 2. Join a challenge
curl -X POST http://localhost:5000/api/v1/challenges/CHALLENGE_ID/join \
  -H "Authorization: Bearer <token>"

# 3. Complete the challenge (automatic tracking)
# Make purchases, sales, or conversions as required

# 4. Claim reward
curl -X POST http://localhost:5000/api/v1/challenges/CHALLENGE_ID/claim \
  -H "Authorization: Bearer <token>"
```

### Redeem Points

```bash
# 1. Check points balance
curl http://localhost:5000/api/v1/rewards/points \
  -H "Authorization: Bearer <token>"

# 2. View available rewards
curl http://localhost:5000/api/v1/rewards/available \
  -H "Authorization: Bearer <token>"

# 3. Redeem points
curl -X POST http://localhost:5000/api/v1/rewards/points/redeem \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"points": 500}'

# Cash added to wallet automatically!
```

---

## 🎯 Integration Notes

### Automatic Features

**Points:**
- Automatically awarded on order completion
- 1 point per ₦100 spent
- Badges checked after each order

**Affiliates:**
- Clicks tracked automatically
- Conversions recorded on order completion
- Commission calculated based on product settings

**Challenges:**
- Progress updated automatically based on user actions
- Completion detected when target reached
- Rewards must be manually claimed

### Commission Structure

**Affiliate Commission:**
- Set per product (default 5%)
- Calculated on product price
- Added to affiliate wallet
- Tracked in AffiliateLink model

### Challenge Progress Tracking

Challenges track progress based on:
- **Orders**: Count of completed orders
- **Sales**: Total sales amount
- **Clicks**: Affiliate link clicks
- **Conversions**: Affiliate conversions

---

## ⚠️ Important Notes

1. **Affiliate Activation:**
   - One-time activation required
   - Generates unique affiliate code
   - Cannot be reversed

2. **Points:**
   - Non-transferable between users
   - Minimum redemption: 100 points
   - 1:1 conversion to Naira

3. **Challenges:**
   - Can join multiple challenges
   - Must claim rewards before expiry
   - Recurring challenges reset automatically

4. **Badges:**
   - Permanent once earned
   - Displayed on profile
   - Show expertise/loyalty

5. **Leaderboards:**
   - Updated in real-time
   - Show top 50 only
   - Period-based or all-time

---

## 🚀 Next Steps (Phase 5)

- Digital product support
- Automatic downloads
- License key generation
- Subscription products

---

**Phase 4 Status**: ✅ Complete  
**Last Updated**: January 2026

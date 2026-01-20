# VendorSpot Backend - Quick Start Guide

## 🎯 What You've Got

A fully functional MERN stack e-commerce backend with:
- ✅ User authentication (register, login, OTP verification)
- ✅ Product management system
- ✅ Role-based access control
- ✅ Payment integration ready (Paystack)
- ✅ Logistics integration ready (ShipBubble)
- ✅ TypeScript for type safety
- ✅ MongoDB database with Mongoose
- ✅ Complete API documentation
- ✅ Postman collection for testing

## 📦 What's in the Package

```
vendorspot-backend/
├── src/                      # Source code
│   ├── controllers/          # Request handlers
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── middleware/          # Auth, validation, errors
│   ├── services/            # Paystack & ShipBubble
│   ├── utils/               # Helper functions
│   └── server.ts            # Main entry point
├── API_DOCUMENTATION.md     # Complete API docs
├── DEPLOYMENT.md            # Deployment guide
├── PHASES.md                # Development roadmap
├── README.md                # Full documentation
├── .env.example             # Environment template
├── package.json             # Dependencies
└── vendorspot-postman-collection.json  # API tests
```

## ⚡ 5-Minute Setup

### 1. Extract & Install
```bash
unzip vendorspot-backend.zip
cd vendorspot-backend
npm install
```

### 2. Configure Environment
```bash
# Copy and edit .env file
cp .env.example .env
nano .env
```

**Minimum required changes:**
- `MONGODB_URI` - Your MongoDB connection
- `JWT_SECRET` - Change to a strong random string

### 3. Start Development Server
```bash
npm run dev
```

Your API is now running at `http://localhost:5000/api/v1` 🎉

## 🧪 Test It

### Quick Test with cURL

**1. Register a user:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "customer"
  }'
```

**2. Check the console for OTP, then verify:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "YOUR_OTP_FROM_CONSOLE"
  }'
```

**3. Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

Save the `accessToken` from the response!

### Or Use Postman

1. Import `vendorspot-postman-collection.json` into Postman
2. Set `baseUrl` to `http://localhost:5000/api/v1`
3. Follow the requests in order (Register → Verify → Login)

## 🔑 Available API Endpoints

### Authentication (`/auth`)
- `POST /auth/register` - Create account
- `POST /auth/verify-email` - Verify email with OTP
- `POST /auth/login` - Sign in
- `POST /auth/forgot-password` - Request reset
- `POST /auth/reset-password` - Reset password
- `GET /auth/me` - Get profile (requires token)
- `PUT /auth/profile` - Update profile
- `PUT /auth/change-password` - Change password

### Products (`/products`)
- `GET /products` - List all products
- `GET /products/:id` - Get single product
- `POST /products` - Create product (Vendor only)
- `PUT /products/:id` - Update product (Vendor only)
- `DELETE /products/:id` - Delete product (Vendor only)

## 📖 Full Documentation

- **API Endpoints**: See `API_DOCUMENTATION.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Development Phases**: See `PHASES.md`
- **Complete Guide**: See `README.md`

## 🚀 What's Next?

**Phase 2 features to implement:**
- Shopping cart
- Order management
- Payment processing (Paystack)
- Delivery tracking (ShipBubble)
- Wallet system

See `PHASES.md` for the complete roadmap!

## 🔧 Common Issues

**MongoDB connection error?**
- Make sure MongoDB is running: `mongod`
- Check your `MONGODB_URI` in `.env`

**Port 5000 already in use?**
- Change `PORT` in `.env` to a different port

**Email not sending?**
- OTPs are logged to console in development
- Update email credentials in `.env` for production

## 💡 Tips

1. **Development**: Use `npm run dev` for hot reload
2. **Production**: Run `npm run build` then `npm start`
3. **Testing**: Import the Postman collection
4. **Database**: View data with MongoDB Compass
5. **Logs**: Check `logs/` directory for errors

## 🎓 Learning Resources

- MongoDB: https://docs.mongodb.com
- Express: https://expressjs.com
- TypeScript: https://www.typescriptlang.org
- Paystack: https://paystack.com/docs
- ShipBubble: https://shipbubble.com/docs

## 📞 Support

Questions? Check the documentation files or:
- Email: sharp@vendorspot.com
- Review the code comments
- Check the Postman collection examples

---

**Built with ❤️ by Sharp**  
Lagos, Nigeria 🇳🇬

Happy Coding! 🚀

# VendorSpot Backend - Deployment Guide

## Quick Start (Development)

1. **Extract the ZIP file**
```bash
unzip vendorspot-backend.zip
cd vendorspot-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
# Copy the .env file and edit with your values
nano .env
```

Required environment variables to update:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Strong secret key (change from default!)
- `EMAIL_USER` & `EMAIL_PASSWORD` - Your SMTP credentials
- `PAYSTACK_SECRET_KEY` - Your Paystack secret key
- `SHIPBUBBLE_API_KEY` - Your ShipBubble API key

4. **Start MongoDB** (if running locally)
```bash
mongod
```

5. **Run the application**
```bash
# Development mode (with hot reload)
npm run dev

# Or build and run production
npm run build
npm start
```

The API will be available at: `http://localhost:5000/api/v1`

---

## Testing the API

### Method 1: Using Postman

1. Import `vendorspot-postman-collection.json` into Postman
2. Set the `baseUrl` variable to `http://localhost:5000/api/v1`
3. Test the endpoints:
   - Register a user
   - Verify email (check console for OTP)
   - Login
   - Create products (as vendor)

### Method 2: Using cURL

**Register a user:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "role": "customer"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

---

## Production Deployment

### Using VPS (Ubuntu)

1. **Install Node.js & MongoDB**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

2. **Clone/Upload your project**
```bash
# If using git
git clone <your-repo>
cd vendorspot-backend

# Or upload the ZIP file and extract
```

3. **Install dependencies & build**
```bash
npm install
npm run build
```

4. **Set up environment variables**
```bash
nano .env
# Update all production values
```

5. **Install PM2 for process management**
```bash
sudo npm install -g pm2
pm2 start dist/server.js --name vendorspot-api
pm2 save
pm2 startup
```

6. **Set up Nginx as reverse proxy**
```bash
sudo apt-get install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/vendorspot

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/vendorspot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. **Set up SSL with Let's Encrypt**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Using Docker

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

2. **Build and run**
```bash
docker build -t vendorspot-api .
docker run -p 5000:5000 --env-file .env vendorspot-api
```

### Using Heroku

1. **Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Login and create app**
```bash
heroku login
heroku create vendorspot-api
```

3. **Add MongoDB**
```bash
heroku addons:create mongolab
```

4. **Set environment variables**
```bash
heroku config:set JWT_SECRET=your_secret
heroku config:set PAYSTACK_SECRET_KEY=your_key
# Set all other variables
```

5. **Deploy**
```bash
git push heroku main
```

---

## Database Setup

### Create Super Admin User

After deployment, you can seed a super admin:

```bash
# Run node REPL
node

# Execute this code:
const mongoose = require('mongoose');
const User = require('./dist/models/User').default;
const bcrypt = require('bcryptjs');

mongoose.connect('your_mongodb_uri');

async function createSuperAdmin() {
  const hashedPassword = await bcrypt.hash('YourSecurePassword', 10);
  const admin = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@vendorspot.com',
    password: hashedPassword,
    role: 'super_admin',
    status: 'active',
    emailVerified: true
  });
  console.log('Super admin created:', admin.email);
  process.exit();
}

createSuperAdmin();
```

---

## API Integration

### Paystack Setup

1. Create account at https://paystack.com
2. Get your API keys from Dashboard → Settings → API Keys
3. Add to `.env`:
   - `PAYSTACK_SECRET_KEY`
   - `PAYSTACK_PUBLIC_KEY`

### ShipBubble Setup

1. Create account at https://shipbubble.com
2. Get your API key from Dashboard
3. Add to `.env`: `SHIPBUBBLE_API_KEY`

### Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password
3. Add to `.env`:
   - `EMAIL_USER=your_email@gmail.com`
   - `EMAIL_PASSWORD=your_app_password`

---

## Monitoring & Logs

### View Logs (PM2)
```bash
pm2 logs vendorspot-api
pm2 monit
```

### View Logs (Docker)
```bash
docker logs <container_id>
```

### Log Files
Logs are stored in the `logs/` directory:
- `error.log` - Error logs only
- `combined.log` - All logs

---

## Performance Optimization

1. **Enable MongoDB Indexes**
   - Indexes are already defined in models
   - They're created automatically on first use

2. **Enable Compression**
   - Already enabled in server.ts

3. **Set up Redis Caching** (Optional)
```bash
# Install Redis
sudo apt-get install redis-server

# Add to .env
REDIS_URL=redis://localhost:6379
```

4. **Enable Rate Limiting**
   - Already configured in server.ts
   - Adjust limits in `.env`

---

## Backup

### Automated MongoDB Backup

Create a backup script:
```bash
#!/bin/bash
mongodump --uri="mongodb://localhost:27017/vendorspot" --out=/backup/mongo-$(date +%Y%m%d)
```

---

## Troubleshooting

### API not starting
```bash
# Check logs
pm2 logs vendorspot-api

# Check if MongoDB is running
sudo systemctl status mongod

# Check if port 5000 is available
sudo lsof -i :5000
```

### Database connection errors
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env`
- Ensure MongoDB allows connections from your IP

### Email not sending
- Verify SMTP credentials
- Check if Gmail App Password is correct
- Ensure 2FA is enabled on Gmail

---

## Support

For issues or questions:
- Email: support@vendorspot.com
- Documentation: See `API_DOCUMENTATION.md`
- Postman Collection: Import `vendorspot-postman-collection.json`

---

## Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Set up firewall (UFW)
- [ ] Configure CORS for your frontend domain
- [ ] Enable MongoDB authentication
- [ ] Set up regular backups
- [ ] Configure rate limiting appropriately
- [ ] Review and update all API keys
- [ ] Set `NODE_ENV=production`

---

**Version**: 1.0.0  
**Last Updated**: January 2026

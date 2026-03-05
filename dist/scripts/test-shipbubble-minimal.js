"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/test-shipbubble-minimal.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || '';
const SHIPBUBBLE_BASE_URL = 'https://api.shipbubble.com/v1';
async function minimalTest() {
    console.log('\n🧪 ShipBubble Minimal Test\n');
    console.log('='.repeat(60));
    const headers = {
        Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
        'Content-Type': 'application/json',
    };
    try {
        // Step 1: Get a valid sender address from your saved addresses
        console.log('\n📍 Step 1: Fetching existing addresses...\n');
        const addressesResponse = await axios_1.default.get(`${SHIPBUBBLE_BASE_URL}/shipping/address`, { headers });
        console.log('Addresses available:', addressesResponse.data.data?.results?.length || 0);
        if (addressesResponse.data.data?.results?.length > 0) {
            const addresses = addressesResponse.data.data.results;
            // Use first two addresses or same address twice
            const senderCode = addresses[0].address_code;
            const receiverCode = addresses.length > 1 ? addresses[1].address_code : addresses[0].address_code;
            console.log('Using existing address codes:');
            console.log('  Sender:', senderCode);
            console.log('  Receiver:', receiverCode);
            // Step 2: Fetch rates using existing addresses
            console.log('\n📦 Step 2: Fetching rates with existing addresses...\n');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const pickupDate = tomorrow.toISOString().split('T')[0];
            const requestBody = {
                sender_address_code: senderCode,
                receipient_address_code: receiverCode,
                pickup_date: pickupDate,
                category_id: 77179563, // Electronics and gadgets
                package_items: [
                    {
                        name: 'Test Product',
                        description: 'Electronics item',
                        unit_weight: '1',
                        unit_amount: '10000',
                        quantity: '1',
                    },
                ],
                package_dimension: {
                    length: 20,
                    width: 20,
                    height: 20,
                },
                service_type: 'pickup',
            };
            console.log('Request body:');
            console.log(JSON.stringify(requestBody, null, 2));
            const ratesResponse = await axios_1.default.post(`${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`, requestBody, { headers, timeout: 30000 });
            console.log('\n✅ SUCCESS!\n');
            console.log('Status:', ratesResponse.data.status);
            console.log('Request Token:', ratesResponse.data.data?.request_token);
            console.log('Couriers found:', ratesResponse.data.data?.couriers?.length || 0);
            if (ratesResponse.data.data?.couriers?.length > 0) {
                console.log('\nFirst 3 couriers:');
                ratesResponse.data.data.couriers.slice(0, 3).forEach((courier, i) => {
                    console.log(`\n${i + 1}. ${courier.courier_name}`);
                    console.log(`   Price: ₦${courier.total.toLocaleString()}`);
                    console.log(`   Delivery: ${courier.delivery_eta}`);
                });
            }
        }
        else {
            console.log('❌ No existing addresses found. Creating new ones...\n');
            // Validate and create addresses
            const senderAddress = {
                name: 'Test Sender',
                phone: '+2348012345678',
                email: 'sender@test.com',
                address: '1 Murtala Muhammed Way, Yaba, Lagos, Nigeria',
            };
            const receiverAddress = {
                name: 'Test Receiver',
                phone: '+2348087654321',
                email: 'receiver@test.com',
                address: '2 Ahmadu Bello Way, Victoria Island, Lagos, Nigeria',
            };
            const senderResponse = await axios_1.default.post(`${SHIPBUBBLE_BASE_URL}/shipping/address/validate`, senderAddress, { headers });
            const receiverResponse = await axios_1.default.post(`${SHIPBUBBLE_BASE_URL}/shipping/address/validate`, receiverAddress, { headers });
            const senderCode = senderResponse.data.data.address_code;
            const receiverCode = receiverResponse.data.data.address_code;
            console.log('✅ New addresses created:');
            console.log('  Sender:', senderCode);
            console.log('  Receiver:', receiverCode);
            // Now fetch rates
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const pickupDate = tomorrow.toISOString().split('T')[0];
            const requestBody = {
                sender_address_code: senderCode,
                receipient_address_code: receiverCode,
                pickup_date: pickupDate,
                category_id: 77179563,
                package_items: [
                    {
                        name: 'Test Product',
                        description: 'Electronics item',
                        unit_weight: '1',
                        unit_amount: '10000',
                        quantity: '1',
                    },
                ],
                package_dimension: {
                    length: 20,
                    width: 20,
                    height: 20,
                },
                service_type: 'pickup',
            };
            console.log('\n📦 Fetching rates...\n');
            console.log('Request body:');
            console.log(JSON.stringify(requestBody, null, 2));
            const ratesResponse = await axios_1.default.post(`${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`, requestBody, { headers, timeout: 30000 });
            console.log('\n✅ SUCCESS!\n');
            console.log('Couriers found:', ratesResponse.data.data?.couriers?.length || 0);
            if (ratesResponse.data.data?.couriers?.length > 0) {
                console.log('\nFirst 3 couriers:');
                ratesResponse.data.data.couriers.slice(0, 3).forEach((courier, i) => {
                    console.log(`\n${i + 1}. ${courier.courier_name}`);
                    console.log(`   Price: ₦${courier.total.toLocaleString()}`);
                    console.log(`   Delivery: ${courier.delivery_eta}`);
                });
            }
        }
    }
    catch (error) {
        console.log('\n❌ FAILED!\n');
        console.log('Error:', error.message);
        console.log('Status:', error.response?.status);
        console.log('\nFull Error Response:');
        console.log(JSON.stringify(error.response?.data, null, 2));
        if (error.response?.status === 422) {
            console.log('\n⚠️ Validation Errors:', error.response?.data?.errors);
        }
    }
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete!\n');
}
minimalTest().catch(console.error);
//# sourceMappingURL=test-shipbubble-minimal.js.map
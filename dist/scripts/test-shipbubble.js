"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/test-shipbubble-fixed.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const shipbubble_service_1 = require("../services/shipbubble.service");
async function testShipBubbleFixed() {
    console.log('\n🧪 Testing ShipBubble API (FIXED VERSION)\n');
    console.log('='.repeat(60));
    const senderAddress = {
        name: 'Test Sender',
        phone: '+2348012345678',
        email: 'sender@test.com',
        address: 'Teslim Balogun Stadium, Alh. Masha Road, Lagos, Nigeria',
    };
    const receiverAddress = {
        name: 'Test Receiver',
        phone: '+2348087654321',
        email: 'receiver@test.com',
        address: 'Landmark Towers, Victoria Island, Lagos, Nigeria',
    };
    const packageItems = [
        {
            name: 'Samsung Galaxy Phone',
            description: 'Electronics - Mobile Phone',
            unit_weight: '0.5',
            unit_amount: '350000',
            quantity: '1',
        },
    ];
    try {
        console.log('\n📦 Step 1: Testing with CORRECT category ID...\n');
        console.log('Using category: 77179563 (Electronics and gadgets)');
        console.log('📍 Sender:', senderAddress.address);
        console.log('📍 Receiver:', receiverAddress.address);
        console.log('\n📦 Step 2: Fetching delivery rates...\n');
        // Test with correct category ID
        const rates = await shipbubble_service_1.shipBubbleService.getDeliveryRates(senderAddress, receiverAddress, packageItems, undefined, 77179563 // Correct category: Electronics and gadgets
        );
        console.log('✅ SUCCESS!\n');
        if (rates.status === 'success' && rates.data) {
            console.log('📋 Request Token:', rates.data.request_token);
            console.log(`\n📋 Found ${rates.data.couriers?.length || 0} couriers:\n`);
            if (rates.data.couriers && rates.data.couriers.length > 0) {
                // Show all couriers
                rates.data.couriers.forEach((courier, index) => {
                    console.log(`${index + 1}. ${courier.courier_name}`);
                    console.log(`   💰 Price: ₦${courier.total.toLocaleString()}`);
                    console.log(`   📦 Service: ${courier.service_type}`);
                    console.log(`   🚚 Delivery: ${courier.delivery_eta}`);
                    console.log(`   ⏰ Pickup: ${courier.pickup_eta}`);
                    console.log('');
                });
                console.log('\n' + '='.repeat(60));
            }
            if (rates.data.cheapest_courier) {
                console.log(`\n💰 CHEAPEST: ${rates.data.cheapest_courier.courier_name}`);
                console.log(`   Price: ₦${rates.data.cheapest_courier.total.toLocaleString()}`);
                console.log(`   Delivery: ${rates.data.cheapest_courier.delivery_eta}`);
            }
            if (rates.data.fastest_courier) {
                console.log(`\n⚡ FASTEST: ${rates.data.fastest_courier.courier_name}`);
                console.log(`   Price: ₦${rates.data.fastest_courier.total.toLocaleString()}`);
                console.log(`   Delivery: ${rates.data.fastest_courier.delivery_eta}`);
            }
            console.log('\n📦 Package Details:');
            console.log('   From:', rates.data.checkout_data?.ship_from?.address);
            console.log('   To:', rates.data.checkout_data?.ship_to?.address);
            console.log('   Weight:', rates.data.checkout_data?.package_weight, 'kg');
            console.log('   Pickup Date:', rates.data.checkout_data?.pickup_date);
            console.log('   Category:', rates.data.checkout_data?.category);
            // Test category helper function
            console.log('\n📋 Category Helper Tests:');
            const testCategories = [
                'electronics',
                'fashion',
                'groceries',
                'health and beauty',
                'furniture',
                'unknown category', // should default
            ];
            testCategories.forEach(cat => {
                const categoryId = shipbubble_service_1.shipBubbleService.getCategoryIdByName(cat);
                console.log(`   "${cat}" → ${categoryId}`);
            });
        }
    }
    catch (error) {
        console.log('\n❌ FAILED!');
        console.log('Error:', error.message);
        console.log('Status:', error.response?.status);
        console.log('\nResponse:', JSON.stringify(error.response?.data, null, 2));
    }
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete!\n');
}
testShipBubbleFixed().catch(console.error);
//# sourceMappingURL=test-shipbubble.js.map
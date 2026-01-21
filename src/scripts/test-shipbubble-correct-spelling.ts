// scripts/test-shipbubble-correct-spelling.ts
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || '';
const SHIPBUBBLE_BASE_URL = 'https://api.shipbubble.com/v1';

async function testCorrectSpelling() {
  console.log('\n🧪 Testing ShipBubble with CORRECT SPELLING\n');
  console.log('='.repeat(60));
  console.log('According to docs: "reciever_address_code" (not receipient or receiver)');
  console.log('='.repeat(60));

  const headers = {
    Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Get existing addresses
    const addressesResponse = await axios.get(
      `${SHIPBUBBLE_BASE_URL}/shipping/address`,
      { headers }
    );

    const addresses = addressesResponse.data.data.results;
    const senderCode = addresses[0].address_code;
    const receiverCode = addresses[1]?.address_code || addresses[0].address_code;

    console.log('\n📍 Using address codes:');
    console.log('   Sender:', senderCode);
    console.log('   Receiver:', receiverCode);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toISOString().split('T')[0];

    // THE CORRECT SPELLING FROM DOCS
    const requestBody = {
      sender_address_code: senderCode,
      reciever_address_code: receiverCode,  // ← CORRECT: "reciever" (one 'e', two 'e's total)
      pickup_date: pickupDate,
      category_id: 77179563,
      package_items: [
        {
          name: 'Samsung Phone',
          description: 'Electronics - Mobile Phone',
          unit_weight: '0.5',
          unit_amount: '350000',
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

    console.log('\n📦 Request Body:');
    console.log(JSON.stringify(requestBody, null, 2));

    console.log('\n📡 Sending request to ShipBubble...\n');

    const response = await axios.post(
      `${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`,
      requestBody,
      { headers, timeout: 30000 }
    );

    console.log('✅ ✅ ✅ SUCCESS! ✅ ✅ ✅\n');
    console.log('Status:', response.data.status);
    console.log('Message:', response.data.message);
    console.log('Request Token:', response.data.data?.request_token);
    console.log(`\n📋 Found ${response.data.data?.couriers?.length || 0} courier options:\n`);

    if (response.data.data?.couriers) {
      response.data.data.couriers.slice(0, 10).forEach((courier: any, i: number) => {
        console.log(`${i + 1}. ${courier.courier_name}`);
        console.log(`   💰 Price: ₦${courier.total.toLocaleString()}`);
        console.log(`   📦 Service: ${courier.service_type}`);
        console.log(`   🚚 Delivery: ${courier.delivery_eta}`);
        console.log(`   ⏰ Pickup: ${courier.pickup_eta}`);
        console.log('');
      });
    }

    if (response.data.data?.cheapest_courier) {
      console.log('\n💰 CHEAPEST COURIER:');
      console.log(`   ${response.data.data.cheapest_courier.courier_name}`);
      console.log(`   ₦${response.data.data.cheapest_courier.total.toLocaleString()}`);
      console.log(`   ${response.data.data.cheapest_courier.delivery_eta}`);
    }

    if (response.data.data?.fastest_courier) {
      console.log('\n⚡ FASTEST COURIER:');
      console.log(`   ${response.data.data.fastest_courier.courier_name}`);
      console.log(`   ₦${response.data.data.fastest_courier.total.toLocaleString()}`);
      console.log(`   ${response.data.data.fastest_courier.delivery_eta}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ShipBubble Integration Working Perfectly! 🎉');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.log('\n❌ FAILED!\n');
    console.log('Error:', error.message);
    console.log('Status:', error.response?.status);
    console.log('\nResponse:');
    console.log(JSON.stringify(error.response?.data, null, 2));
  }
}

testCorrectSpelling().catch(console.error);
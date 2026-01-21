// scripts/debug-shipbubble-request.ts
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const SHIPBUBBLE_API_KEY = process.env.SHIPBUBBLE_API_KEY || '';
const SHIPBUBBLE_BASE_URL = 'https://api.shipbubble.com/v1';

async function debugRequest() {
  console.log('\n🔍 DEBUG: ShipBubble Request Body\n');
  console.log('='.repeat(60));

  // Step 1: Validate addresses first
  const headers = {
    Authorization: `Bearer ${SHIPBUBBLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

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

  try {
    console.log('\n📍 Step 1: Validating addresses...\n');

    const senderResponse = await axios.post(
      `${SHIPBUBBLE_BASE_URL}/shipping/address/validate`,
      senderAddress,
      { headers }
    );

    const receiverResponse = await axios.post(
      `${SHIPBUBBLE_BASE_URL}/shipping/address/validate`,
      receiverAddress,
      { headers }
    );

    const senderCode = senderResponse.data.data.address_code;
    const receiverCode = receiverResponse.data.data.address_code;

    console.log('✅ Sender Code:', senderCode);
    console.log('✅ Receiver Code:', receiverCode);

    // Step 2: Prepare the request body - TEST BOTH SPELLINGS
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDate = tomorrow.toISOString().split('T')[0];

    console.log('\n📦 Step 2: Testing BOTH parameter spellings...\n');

    // TEST 1: With correct spelling (receiver)
    const requestBody1 = {
      sender_address_code: senderCode,
      receiver_address_code: receiverCode,  // Correct spelling
      pickup_date: pickupDate,
      category_id: 77179563,
      package_items: [
        {
          name: 'Test Product',
          description: 'A test product',
          unit_weight: '0.5',
          unit_amount: '5000',
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

    console.log('TEST 1: Using "receiver_address_code" (correct spelling)');
    console.log(JSON.stringify(requestBody1, null, 2));

    try {
      const response1 = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`,
        requestBody1,
        { headers }
      );
      console.log('✅ TEST 1 SUCCESS!');
      console.log('Couriers found:', response1.data.data?.couriers?.length || 0);
    } catch (error: any) {
      console.log('❌ TEST 1 FAILED:', error.response?.data?.message);
      console.log('Errors:', error.response?.data?.errors);
    }

    console.log('\n' + '-'.repeat(60) + '\n');

    // TEST 2: With typo spelling (receipient)
    const requestBody2 = {
      sender_address_code: senderCode,
      receipient_address_code: receiverCode,  // Typo spelling
      pickup_date: pickupDate,
      category_id: 77179563,
      package_items: [
        {
          name: 'Test Product',
          description: 'A test product',
          unit_weight: '0.5',
          unit_amount: '5000',
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

    console.log('TEST 2: Using "receipient_address_code" (typo spelling)');
    console.log(JSON.stringify(requestBody2, null, 2));

    try {
      const response2 = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`,
        requestBody2,
        { headers }
      );
      console.log('✅ TEST 2 SUCCESS!');
      console.log('Couriers found:', response2.data.data?.couriers?.length || 0);
    } catch (error: any) {
      console.log('❌ TEST 2 FAILED:', error.response?.data?.message);
      console.log('Errors:', error.response?.data?.errors);
    }

    console.log('\n' + '-'.repeat(60) + '\n');

    // TEST 3: With BOTH parameters (just in case)
    const requestBody3 = {
      sender_address_code: senderCode,
      receiver_address_code: receiverCode,
      receipient_address_code: receiverCode,  // Include both!
      pickup_date: pickupDate,
      category_id: 77179563,
      package_items: [
        {
          name: 'Test Product',
          description: 'A test product',
          unit_weight: '0.5',
          unit_amount: '5000',
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

    console.log('TEST 3: Using BOTH "receiver_address_code" AND "receipient_address_code"');
    console.log(JSON.stringify(requestBody3, null, 2));

    try {
      const response3 = await axios.post(
        `${SHIPBUBBLE_BASE_URL}/shipping/fetch_rates`,
        requestBody3,
        { headers }
      );
      console.log('✅ TEST 3 SUCCESS!');
      console.log('Couriers found:', response3.data.data?.couriers?.length || 0);
    } catch (error: any) {
      console.log('❌ TEST 3 FAILED:', error.response?.data?.message);
      console.log('Errors:', error.response?.data?.errors);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Response:', error.response?.data);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Debug Complete!\n');
}

debugRequest().catch(console.error);
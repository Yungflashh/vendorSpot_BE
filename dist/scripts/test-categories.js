"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/test-categories.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const shipbubble_service_1 = require("../services/shipbubble.service");
async function testCategories() {
    console.log('\n🧪 Testing ShipBubble Categories\n');
    console.log('='.repeat(60));
    try {
        const categories = await shipbubble_service_1.shipBubbleService.getCategories();
        console.log('✅ Categories Retrieved:\n');
        console.log('Full Response:', JSON.stringify(categories, null, 2));
        if (categories.data && Array.isArray(categories.data)) {
            console.log('\n📋 Available Categories:\n');
            categories.data.forEach((cat) => {
                // Try different possible field names
                const id = cat.id || cat.category_id || cat.categoryId || 'Unknown';
                const name = cat.name || cat.category || cat.categoryName || 'Unknown';
                console.log(`ID: ${id} - ${name}`);
            });
        }
    }
    catch (error) {
        console.log('❌ Failed to get categories');
        console.log('Error:', error.message);
        console.log('Response:', JSON.stringify(error.response?.data, null, 2));
    }
    console.log('\n' + '='.repeat(60));
}
testCategories().catch(console.error);
//# sourceMappingURL=test-categories.js.map
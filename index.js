const DB = require('./src/database/db');
const PayoutService = require('./src/services/PayoutService');
const UserService = require('./src/services/UserService');

console.log("=== Starting User Payout Management System Simulation ===\n");

const userId = "john_doe";

// 1. Ingest Initial Sales
console.log("1. Ingesting Sales before reconciliation...");
const sale1 = PayoutService.addSale(userId, "brand_1", 40);
const sale2 = PayoutService.addSale(userId, "brand_1", 40);
const sale3 = PayoutService.addSale(userId, "brand_1", 40);

console.log(`Total Pending Sales added: ${DB.sales.length}`);
console.log(`User's initial withdrawable balance: ₹${DB.users[userId].withdrawable_balance}\n`);

// 2. Process Advance Payouts (10%)
console.log("2. Processing 10% Advance Payouts...");
const advanceResult = PayoutService.processAdvancePayouts();
console.log(`Processed advances for ${advanceResult.processedCount} sales.`);
console.log(`User's balance after advance payouts: ₹${DB.users[userId].withdrawable_balance}\n`);

// 3. Admin Reconciliation
console.log("3. Reconciling Sales (1 Rejected, 2 Approved)...");
PayoutService.reconcileSale(sale1.id, 'rejected');
PayoutService.reconcileSale(sale2.id, 'approved');
PayoutService.reconcileSale(sale3.id, 'approved');

// 4. Final Calculation Check
console.log("=== Final Ledger ===");
console.log(`Final Withdrawable Balance for ${userId}: ₹${DB.users[userId].withdrawable_balance}`);
console.log("Expected Output according to assignment: ₹68");

if (DB.users[userId].withdrawable_balance === 68) {
    console.log("✅ SUCCESS: The calculated balance matches the expected output!\n");
} else {
    console.log("❌ FAILURE: The calculated balance is incorrect.\n");
}

// 5. Simulate Withdrawal and Failure Recovery
console.log("5. Testing Withdrawal Rules...");
try {
    console.log("Attempting to withdraw ₹68...");
    const txn = UserService.requestWithdrawal(userId, 68);
    console.log(`Withdrawal successful. Transaction ID: ${txn.id}`);
    console.log(`Balance after withdrawal: ₹${DB.users[userId].withdrawable_balance}`);
    
    console.log("\nAttempting an immediate second withdrawal (should fail due to 24h rule)...");
    UserService.requestWithdrawal(userId, 10);
} catch (error) {
    console.log(`Expected Error Caught: ${error.message}`);
}

console.log("\n6. Simulating Failed Payout Webhook...");
const lastTxnId = DB.transactions[0].id;
PayoutService.handlePayoutStatusUpdate(lastTxnId, 'failed');
console.log(`Webhook triggered: Transaction ${lastTxnId} marked as failed.`);
console.log(`Balance after refund: ₹${DB.users[userId].withdrawable_balance}`);
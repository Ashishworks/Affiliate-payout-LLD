const DB = require('../database/db');

class PayoutService {
    /**
     * Ingests a new sale into the system.
     * Every sale initially enters with the status 'pending'.
     * 
     * @param {string} userId - ID of the user who made the sale
     * @param {string} brand - Brand name
     * @param {number} earnings - Total earnings for the sale
     * @returns {object} The created sale record
     */
    static addSale(userId, brand, earnings) {
        const sale = {
            id: `sale_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            userId,
            brand,
            status: 'pending',
            earnings,
            advancePaid: 0,
            isAdvanceProcessed: false
        };
        DB.sales.push(sale);
        return sale;
    }

    /**
     * Cron-job equivalent to process advance payouts.
     * Provides 10% of earnings for all eligible pending sales.
     * Ensures advances are only paid out once per sale.
     * 
     * @returns {object} Result summary of processed advances
     */
    static processAdvancePayouts() {
        const pendingSales = DB.sales.filter(s => s.status === 'pending' && !s.isAdvanceProcessed);
        let totalAdvanced = 0;

        for (const sale of pendingSales) {
            // Calculate 10% advance
            const advanceAmount = Number((sale.earnings * 0.10).toFixed(2));
            
            // Mark sale as processed and record the advance amount
            sale.advancePaid = advanceAmount;
            sale.isAdvanceProcessed = true;
            
            // Credit the user's withdrawable balance
            if (DB.users[sale.userId]) {
                DB.users[sale.userId].withdrawable_balance += advanceAmount;
                totalAdvanced += advanceAmount;
            }
        }
        
        return { processedCount: pendingSales.length, totalAdvanced };
    }

    /**
     * Admin reconciliation process.
     * Updates sale status to 'approved' or 'rejected' and adjusts user balance.
     * 
     * @param {string} saleId - The ID of the sale to reconcile
     * @param {string} newStatus - 'approved' or 'rejected'
     * @returns {object} The updated sale record
     */
    static reconcileSale(saleId, newStatus) {
        if (!['approved', 'rejected'].includes(newStatus)) {
            throw new Error("Invalid status. Must be 'approved' or 'rejected'.");
        }

        const sale = DB.sales.find(s => s.id === saleId);
        if (!sale) throw new Error("Sale not found.");
        if (sale.status !== 'pending') throw new Error("Sale has already been reconciled.");

        const user = DB.users[sale.userId];
        if (!user) throw new Error("User associated with sale not found.");
        
        if (newStatus === 'approved') {
            // Case 1: Approved - Add the remaining payout (Earnings - Advance Paid)
            const remainingPayout = sale.earnings - sale.advancePaid;
            user.withdrawable_balance += remainingPayout;
        } else if (newStatus === 'rejected') {
            // Case 2: Rejected - Deduct the advance already given
            user.withdrawable_balance -= sale.advancePaid;
        }

        // Update the sale status
        sale.status = newStatus;
        return sale;
    }

    /**
     * Webhook listener for payout status updates from payment gateways.
     * Credits failed payouts back to the user's balance.
     * 
     * @param {string} transactionId - The ID of the withdrawal transaction
     * @param {string} newStatus - The updated status (e.g., 'failed', 'success')
     * @returns {object} The updated transaction record
     */
    static handlePayoutStatusUpdate(transactionId, newStatus) {
        const transaction = DB.transactions.find(t => t.id === transactionId);
        if (!transaction) throw new Error("Transaction not found.");

        const failureStatuses = ['failed', 'cancelled', 'rejected'];
        
        // If the payout failed and hasn't been refunded yet
        if (failureStatuses.includes(newStatus) && transaction.status === 'initiated') {
            const user = DB.users[transaction.userId];
            if (user) {
                // Credit the failed amount back
                user.withdrawable_balance += transaction.amount;
                
                // Reset withdrawal timer to allow immediate retry
                user.last_withdrawal_at = null; 
            }
        }

        transaction.status = newStatus;
        return transaction;
    }
}

module.exports = PayoutService;
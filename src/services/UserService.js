const DB = require('../database/db');

class UserService {
    /**
     * Processes a withdrawal request for a user.
     * Enforces the 24-hour withdrawal restriction and checks balance.
     * 
     * @param {string} userId - The ID of the user requesting withdrawal
     * @param {number} amount - The amount to withdraw
     * @returns {object} The initiated transaction record
     */
    static requestWithdrawal(userId, amount) {
        const user = DB.users[userId];
        if (!user) throw new Error("User not found.");

        // Check 24-hour restriction
        if (user.last_withdrawal_at) {
            const hoursSinceLast = (Date.now() - user.last_withdrawal_at) / (1000 * 60 * 60);
            if (hoursSinceLast < 24) {
                throw new Error("Withdrawal restricted: You can only make one withdrawal every 24 hours.");
            }
        }

        // Check balance
        if (user.withdrawable_balance < amount || amount <= 0) {
            throw new Error(`Insufficient balance. Current balance: ₹${user.withdrawable_balance}`);
        }

        // Deduct balance and update timestamp
        user.withdrawable_balance -= amount;
        user.last_withdrawal_at = Date.now();

        // Create transaction record
        const transaction = {
            id: `txn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            userId,
            amount,
            type: 'withdrawal',
            status: 'initiated',
            createdAt: Date.now()
        };
        
        DB.transactions.push(transaction);

        return transaction;
    }
}

module.exports = UserService;
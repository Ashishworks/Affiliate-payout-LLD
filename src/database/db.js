/**
 * In-memory mock database to simulate a relational database system.
 * In a production environment, this module would export a connection to PostgreSQL/MySQL.
 */

const DB = {
    // Users Table
    users: {
        // Pre-populating the test user for the assignment example
        "john_doe": { 
            id: "john_doe", 
            name: "John Doe",
            withdrawable_balance: 0, 
            last_withdrawal_at: null 
        }
    },
    
    // Sales Table
    sales: [],
    
    // Payout Transactions Table
    transactions: []
};

module.exports = DB;
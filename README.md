# Payout Management System - Low Level Design (LLD)

This repository contains the Low-Level Design (LLD) and working implementation for a User Payout Management System. The system handles affiliate sales ingestion, automated advance payouts, admin reconciliations, withdrawal restrictions, and failure recovery.

## 📖 Overview

The core objective of this system is to manage user payouts effectively based on affiliate sales. It enforces specific business rules regarding how and when users can withdraw funds, ensuring accurate ledger calculations regardless of whether a sale is eventually approved or rejected by an administrator.

## 🏗️ System Architecture & Design

The solution is structured using a modular, service-oriented architecture implemented in Node.js. 

### Core Components
*   **Database Interface (`db.js`)**: An in-memory mock repository simulating a relational database (e.g., PostgreSQL).
*   **PayoutService (`PayoutService.js`)**: Handles sale ingestion, 10% advance calculations, admin reconciliation logic, and webhook failure recovery.
*   **UserService (`UserService.js`)**: Manages the user's digital wallet, validating balances, and enforcing the 24-hour withdrawal rate limit.
*   **Simulation Script (`index.js`)**: An entry point that executes the assignment's exact test case to verify the final payout of ₹68[cite: 1].

---

## 🗄️ Database Schema Design

A relational model is assumed for this design to guarantee ACID compliance for financial ledgers.

### 1. `users` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key |
| `name` | String | User's full name |
| `withdrawable_balance` | Decimal | Current available balance (can be negative if advances exceed approvals) |
| `last_withdrawal_at` | Timestamp | Tracks the time of the last withdrawal for the 24-hour rule |

### 2. `sales` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key |
| `user_id` | String (UUID) | Foreign Key referencing `users.id` |
| `brand` | String | Brand identifier |
| `status` | Enum | `pending`, `approved`, `rejected`[cite: 1] |
| `earnings` | Decimal | Total earnings for the sale[cite: 1] |
| `advance_paid` | Decimal | Amount already paid in advance[cite: 1] |
| `is_advance_processed`| Boolean | Idempotency key to prevent duplicate advances |

### 3. `transactions` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | String (UUID) | Primary Key |
| `user_id` | String (UUID) | Foreign Key referencing `users.id` |
| `amount` | Decimal | Transaction amount |
| `type` | Enum | `withdrawal`, `refund` |
| `status` | Enum | `initiated`, `success`, `failed`, `cancelled`, `rejected`[cite: 1] |
| `created_at` | Timestamp | Record creation timestamp |

---

## 🚀 API Endpoints Defined

While this repository contains the internal service logic, in a production environment, these services would be exposed via the following REST APIs:

*   `POST /api/sales` - Ingests a new sale (`status: pending`)[cite: 1].
*   `POST /api/jobs/process-advances` - Cron-triggered endpoint to calculate and distribute 10% advances[cite: 1].
*   `PUT /api/admin/sales/:id/reconcile` - Admin endpoint to approve or reject a sale and adjust user balances accordingly[cite: 1].
*   `POST /api/payouts/withdraw` - Initiates a withdrawal, strictly enforcing the 1-withdrawal-per-24-hours rule[cite: 1].
*   `POST /api/webhooks/payout-update` - Listens for payment gateway status updates (credits failed withdrawals back to the user)[cite: 1].

---

## 🛡️ Edge Cases Handled

1.  **Idempotency in Advance Payouts**: The system uses a boolean flag (`is_advance_processed`) to ensure that even if the advance payout job runs multiple times or retries, a sale never receives more than one advance[cite: 1].
2.  **Negative Balances**: If a high-value sale receives an advance and is later rejected, the system subtracts the advance from the user's wallet. This naturally allows the balance to go negative, meaning future approved sales will automatically pay off this "debt" before the user can withdraw again[cite: 1].
3.  **Failed Payout Recovery**: If a withdrawal fails (e.g., bank rejection), the system immediately refunds the user's `withdrawable_balance` and resets their `last_withdrawal_at` timer so they are not unfairly locked out for another 24 hours[cite: 1].

---

## ⚖️ Trade-offs and Design Decisions

*   **Running Balance vs. Ledger Aggregation**: 
    *   *Decision*: Maintained a running `withdrawable_balance` on the `users` table.
    *   *Trade-off*: Reading the balance is extremely fast $O(1)$, which is ideal for high-traffic dashboards. The trade-off is that any writes to this balance require strict database locks to prevent race conditions. An alternative would be an append-only event sourcing ledger, which is safer but slower to query.
*   **Asynchronous Failure Handling**:
    *   *Decision*: Designed the failure recovery as a separate webhook handler (`handlePayoutStatusUpdate`).
    *   *Trade-off*: Decouples the main API from third-party payment gateways, ensuring the system remains highly available even if the gateway is slow to respond.

---

## 💻 How to Run the Project

### Prerequisites
*   Node.js installed on your machine (v14+ recommended).

### Setup
1. Clone the repository:
   ```bash
   git clone <your-repo-link>
   cd payout-management-system
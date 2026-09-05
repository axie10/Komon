# Komon
 
A decentralized shared pot protocol built on Ethereum L2. Komon eliminates the trust problem in group expenses — no one controls the funds, everyone votes, and every transaction is transparent and immutable.
 
Split trips, gifts, rent, or any shared expense with your group. The smart contract is the neutral party that never takes sides.
 
## How It Works
 
```
Create a Pot → Members contribute → Someone proposes an expense
                                            ↓
                                   Group votes (2/3 majority)
                                            ↓
                                   Approved → Payment executes automatically
                                   Rejected → Nothing happens
                                            ↓
                                   Pot closes → Remaining funds returned
```
 
## Architecture
 
Komon follows a modular multi-contract design where each component has a single, well-defined responsibility:
 
```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  KomonFactory                                                 │
│  ─────────────                                                │
│  Creates and registers Pot instances                          │
│  One Pot per group — fully isolated funds and permissions     │
│                                                               │
│         │ deploy                                              │
│         ▼                                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Pot                                                    │  │
│  │                                                         │  │
│  │  CONFIG (immutable at creation)                         │  │
│  │  ├─ Currency: ETH | USDC | USDT                        │  │
│  │  ├─ Contribution amount per member                      │  │
│  │  ├─ Member list                                         │  │
│  │  └─ Contribution deadline                               │  │
│  │                                                         │  │
│  │  CONTRIBUTIONS                                          │  │
│  │  ├─ contribute()           → deposit your share         │  │
│  │  └─ hasContributed()       → verify contribution        │  │
│  │                                                         │  │
│  │  PROPOSALS                                              │  │
│  │  ├─ createProposal()       → propose expense + tag      │  │
│  │  ├─ vote()                 → vote for / against         │  │
│  │  └─ executeProposal()      → execute if 2/3 approve    │  │
│  │                                                         │  │
│  │  LIFECYCLE                                              │  │
│  │  ├─ cancelPot()            → auto-cancel on deadline    │  │
│  │  ├─ emergencyExit()        → 2/3 vote to close early   │  │
│  │  ├─ closePot()             → normal close               │  │
│  │  └─ claimRefund()          → withdraw remaining funds   │  │
│  │                                                         │  │
│  │  ON-CHAIN RECEIPTS (Events)                             │  │
│  │  ├─ PotCreated                                          │  │
│  │  ├─ ContributionReceived                                │  │
│  │  ├─ ProposalCreated(tag)                                │  │
│  │  ├─ VoteCast                                            │  │
│  │  ├─ ProposalExecuted(amount, to, tag)                   │  │
│  │  ├─ EmergencyExitTriggered                              │  │
│  │  └─ RefundClaimed                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```
 
## Features
 
### Multi-Currency Support
Each pot operates in a single currency chosen at creation — ETH, USDC, or USDT. Stablecoins are handled via OpenZeppelin's SafeERC20 for full compatibility.
 
### Equal Contributions
Every member contributes the same amount. No confusion, no awkward conversations about who owes what.
 
### Contribution Deadline
If not all members contribute before the deadline, the pot auto-cancels and everyone reclaims their funds. No more waiting for that one friend who never pays.
 
### Expense Tags
Every proposal carries a category tag (food, transport, accommodation, party). Transparent, organized on-chain history of where the money went.
 
### Emergency Exit
If 2/3 of the group votes to exit, the pot closes and remaining funds are distributed proportionally. For when plans change.
 
### On-Chain Receipts
Every approved expense emits a detailed event — amount, recipient, category, timestamp. Immutable proof of every transaction.
 
## Pot Lifecycle
 
```
FUNDING ── deadline passes ──▶ CANCELLED (everyone claims refund)
   │
   │ all members contribute
   ▼
ACTIVE ── emergencyExit() ──▶ CLOSED (proportional distribution)
   │
   │ closePot()
   ▼
CLOSED ──▶ claimRefund() (each member collects their share)
```
 
## Security
 
- Checks-Effects-Interactions pattern on every ETH and token transfer
- ReentrancyGuard on all fund movements
- Access control — only members interact, only approved proposals move funds
- No double voting per proposal
- No double contribution per member
- SafeERC20 for non-standard token compatibility (USDT)
## Tech Stack
 
| Tool            | Purpose                           |
| --------------- | --------------------------------- |
| Solidity ^0.8.x | Smart contract language           |
| Foundry         | Development, testing, deployment  |
| OpenZeppelin    | SafeERC20, ReentrancyGuard        |
| Arbitrum / Base | L2 deployment                     |
 
## Project Structure
 
```
├── src/
│   ├── KomonFactory.sol          # Creates and registers pots
│   ├── Pot.sol                   # Core pot logic
│   └── interfaces/
│       └── IPot.sol              # Pot interface
├── test/
│   ├── KomonFactory.t.sol
│   ├── Pot.t.sol
│   ├── PotETH.t.sol              # ETH-specific tests
│   └── PotStablecoin.t.sol       # USDC/USDT tests
├── script/
│   └── DeployKomonFactory.s.sol
└── foundry.toml
```
 
## Getting Started
 
### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
### Build
```bash
forge build
```
 
### Test
```bash
forge test -vv
```
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
│  │  ├─ Currency: ETH | ERC-20 (USDC, USDT, etc.)          │  │
│  │  ├─ Contribution amount per member                      │  │
│  │  ├─ Member list                                         │  │
│  │  ├─ Contribution deadline                               │  │
│  │  └─ Creator                                             │  │
│  │                                                         │  │
│  │  CONTRIBUTIONS                                          │  │
│  │  ├─ contribute()           → deposit your share         │  │
│  │  └─ hasContributed()       → verify contribution        │  │
│  │                                                         │  │
│  │  PROPOSALS                                              │  │
│  │  ├─ createProposal()       → propose expense + tag      │  │
│  │  ├─ vote()                 → vote for / against         │  │
│  │  ├─ executeProposal()      → execute if 2/3 approve    │  │
│  │  └─ cancelProposal()       → 2/3 vote to release funds │  │
│  │                                                         │  │
│  │  FUND RESERVATION                                       │  │
│  │  ├─ reservedFunds          → funds locked in APPROVED  │  │
│  │  └─ Prevents concurrent over-approval                   │  │
│  │                                                         │  │
│  │  LIFECYCLE                                              │  │
│  │  ├─ cancelPot()            → auto-cancel on deadline    │  │
│  │  ├─ emergencyExit()        → 2/3 vote to close early   │  │
│  │  ├─ closePot()             → 2/3 vote to close normally│  │
│  │  └─ claimRefund()          → withdraw remaining funds   │  │
│  │                                                         │  │
│  │  ON-CHAIN RECEIPTS (Events)                             │  │
│  │  ├─ PotCreated                                          │  │
│  │  ├─ ContributionReceived                                │  │
│  │  ├─ ProposalCreated(tag)                                │  │
│  │  ├─ VoteCast                                            │  │
│  │  ├─ ProposalExecuted(amount, to, tag)                   │  │
│  │  ├─ ProposalCancelled                                   │  │
│  │  ├─ CancelVote                                          │  │
│  │  ├─ EmergencyExitVote                                   │  │
│  │  ├─ EmergencyExitTriggered                              │  │
│  │  ├─ CloseVote                                           │  │
│  │  ├─ PotClosed                                           │  │
│  │  └─ RefundClaimed                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Features

### Multi-Currency Support
Each pot operates in a single currency chosen at creation — ETH or any ERC-20 token (USDC, USDT, etc.). Handles fee-on-transfer tokens by tracking real balance deltas instead of nominal amounts. Uses OpenZeppelin's SafeERC20 for non-standard token compatibility.

### Equal Contributions
Every member contributes the same amount. No confusion, no awkward conversations about who owes what.

### Contribution Deadline
If not all members contribute before the deadline, the pot auto-cancels and everyone reclaims their funds. No more waiting for that one friend who never pays.

### Fund Reservation
When a proposal is approved, its amount is reserved from the available pot balance. This prevents concurrent over-approval — you cannot approve more spending than the pot actually has available.

### Expense Tags
Every proposal carries a category tag (food, transport, accommodation, party, shopping, other). Transparent, organized on-chain history of where the money went.

### Cancel Approved Proposals
If an approved proposal shouldn't execute anymore (plans changed, recipient unreachable), members can vote 2/3 to cancel it and release the reserved funds back to the pot.

### Governance-Based Close
Two ways to close a pot early — both require 2/3 majority:
- **Normal close** — the group agrees the pot's purpose is complete
- **Emergency exit** — the group needs to shut down and refund remaining funds

Neither the creator nor any single member can unilaterally close the pot.

### On-Chain Receipts
Every action emits a detailed event — amount, recipient, category, timestamp. Immutable proof of every decision.

## Pot Lifecycle

```
FUNDING ── deadline passes ──▶ CANCELLED (everyone claims contributed amount)
   │
   │ all members contribute
   ▼
ACTIVE ── emergencyExit() ──▶ CLOSED (proportional distribution)
   │       or closePot()
   │
   ▼
CLOSED ──▶ claimRefund() (each member collects their share)
```

## Security

Komon underwent an internal security audit covering the OWASP top vulnerabilities for smart contracts. Key protections:

- **Reentrancy protection** — `ReentrancyGuard` on all fund-moving functions with explicit proof-of-concept tests
- **Checks-Effects-Interactions** pattern on every ETH and ERC-20 transfer
- **Access control** — only members interact; only approved proposals move funds
- **Proposal ID validation** — prevents interaction with non-existent proposals
- **Real balance tracking** — safe against fee-on-transfer and rebasing tokens
- **No double-voting** — separate mappings for voting, cancellation, emergency exit, and close
- **No double-contribution** — enforced per member with immutable flags
- **SafeERC20** — for non-standard token compatibility (USDT and similar)
- **Fixed compiler version** — pragma pinned to `0.8.35` for deterministic bytecode
- **Governance-only close** — no unilateral shutdown power

### Test Coverage

85 tests covering:
- All core flows (contribute, propose, vote, execute, cancel, refund)
- Reentrancy PoCs on `contribute`, `executeProposal`, and `claimRefund`
- Fee-on-transfer token integration
- Hook-based token attacks (ERC-777 style)
- Quorum edge cases (2 to 30 members, fuzz-tested)
- State transition validation
- Zero-address and duplicate-member rejection

```bash
forge test -vvv
```

## Tech Stack

### Smart Contracts
| Tool            | Purpose                           |
| --------------- | --------------------------------- |
| Solidity 0.8.35 | Smart contract language           |
| Foundry         | Development, testing, deployment  |
| OpenZeppelin    | SafeERC20, ReentrancyGuard        |

### Frontend
| Tool          | Purpose                       |
| ------------- | ----------------------------- |
| React 18      | UI framework                  |
| Vite          | Build tool                    |
| Tailwind CSS  | Styling                       |
| ethers.js v6  | Blockchain interaction        |
| React Router  | Client-side routing           |

### Deployment
| Network            | Purpose        |
| ------------------ | -------------- |
| Arbitrum Sepolia   | Live testnet   |
| Vercel             | Frontend host  |

## Frontend Highlights

- **Real-time state** — dashboard reflects on-chain changes automatically
- **Multi-language** — English and Spanish support
- **Dark mode** — persisted across sessions
- **Member aliases** — human-readable names stored locally
- **ENS resolution** — automatic on supported networks
- **Activity feed** — reads events from the blockchain
- **Expense analytics** — spending by category, per-member balances
- **Settlement summary** — full breakdown when a pot closes
- **Templates** — quick setup for trips, shared rent, gifts, events
- **Confirmation modals** — safety on critical actions
- **Responsive design** — works on mobile and desktop

## Project Structure

```
komon/
├── src/                          # Smart contracts
│   ├── KomonFactory.sol
│   ├── Pot.sol
│   └── interfaces/
│       └── IPot.sol
├── test/
│   ├── KomonFactory.t.sol
│   ├── Pot.t.sol
│   ├── PotSecurity.t.sol         # Reentrancy PoCs + edge cases
│   └── mocks/
│       ├── MockUSDC.sol
│       ├── HookToken.sol         # ERC-777 style hook attacker
│       └── FeeOnTransferToken.sol
├── script/
│   ├── DeployKomonFactory.s.sol
│   └── DeployMockUSDC.s.sol
├── frontend/                     # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── config/
│   │   └── i18n/
│   └── package.json
└── foundry.toml
```

## Try Komon Live

Komon is deployed on **Arbitrum Sepolia** and hosted on Vercel. Anyone can try it — you just need a Web3 wallet and some testnet ETH.

**Live app:** [YOUR_VERCEL_URL]

**Factory contract:** [`0xC01A603934C10C15AA53368e2dEBcB20D591E96a`](https://sepolia.arbiscan.io/address/0xC01A603934C10C15AA53368e2dEBcB20D591E96a) (verified on Arbiscan)

**Full walkthrough:** [docs/USER_GUIDE.md](./documentation/USER_GUIDE.md)

## Getting Started

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Node.js](https://nodejs.org/) 18+
- MetaMask (or any Web3 wallet)

### Smart Contracts

```bash
# Install dependencies
forge install

# Build
forge build

# Run tests
forge test -vvv

# Deploy locally
anvil                                       # in one terminal
forge script script/DeployKomonFactory.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key <ANVIL_PRIVATE_KEY> \
  --broadcast
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Paste the deployed Factory address on first load.

## License

MIT
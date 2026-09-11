# User Guide

This guide walks you through trying Komon live on Arbitrum Sepolia.

## What You'll Need

- A Web3 wallet ([MetaMask](https://metamask.io/) recommended)
- Some testnet ETH (~0.01 ETH is enough for testing)
- ~5 minutes

## 1. Add Arbitrum Sepolia to your wallet

If your wallet doesn't already have Arbitrum Sepolia, add it manually:

| Field           | Value                                       |
| --------------- | ------------------------------------------- |
| Network name    | Arbitrum Sepolia                            |
| RPC URL         | https://sepolia-rollup.arbitrum.io/rpc      |
| Chain ID        | 421614                                      |
| Symbol          | ETH                                         |
| Block Explorer  | https://sepolia.arbiscan.io                 |

Or add it in one click via [ChainList](https://chainlist.org/?search=arbitrum+sepolia&testnets=true).

## 2. Get testnet ETH

Arbitrum Sepolia ETH has no real value — it's just for testing. Two ways to get some:

**Option A — Direct faucet (if available):**
- [Alchemy Arbitrum Sepolia Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia) (requires 0.001 ETH on mainnet)
- [QuickNode Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

**Option B — Via Ethereum Sepolia + bridge (no requirements):**
1. Mine Sepolia ETH at [pk910 PoW Faucet](https://sepolia-faucet.pk910.de/) (open the page and let it run 10-15 min)
2. Bridge to Arbitrum Sepolia via [Arbitrum Bridge](https://bridge.arbitrum.io/) (enable "Testnet mode")
3. Wait ~15 minutes for the bridge to complete

## 3. Open the app

Visit https://komon-three.vercel.app/ and click **Connect Wallet**.

Make sure MetaMask is on Arbitrum Sepolia before connecting.

## 4. Configure the Factory

On first visit, you need to point the app to the deployed Factory contract:

1. Go to the Dashboard
2. Click **⚙ Factory** in the top right
3. Paste the Factory address:

```
0xC01A603934C10C15AA53368e2dEBcB20D591E96a
```

The address is saved locally — you only need to do this once per browser.

**Verify the contract on Arbiscan:**
https://sepolia.arbiscan.io/address/0xC01A603934C10C15AA53368e2dEBcB20D591E96a

## 5. Test the full flow

To try Komon end-to-end you'll need multiple wallets to simulate a group. The easiest way is to create additional accounts in your MetaMask:

1. Open MetaMask → click your account icon → **+ Add account**
2. Create 2-3 additional accounts
3. Send a small amount of ETH from your main account to each (they need gas for transactions)

Now you can play all roles:

### Create a pot
- Click **New pot**
- Use a template (Trip, Shared rent, Group gift, Event) or configure manually
- Add the addresses of your test accounts as members
- Set a contribution amount (e.g., 0.001 ETH)
- Set a deadline (e.g., 7 days)
- Create the pot

### Contribute
- Switch between your MetaMask accounts and contribute from each
- When all members contribute, the pot activates automatically

### Propose an expense
- Anyone can create a proposal
- Choose a category (food, transport, etc.), amount, recipient, description

### Vote
- Switch accounts and vote from each
- Once 2/3 of members vote in favor, the proposal is auto-approved

### Execute
- Anyone can execute an approved proposal
- Funds are sent to the recipient automatically

### Close the pot
- Vote to close normally, or trigger an emergency exit
- Each member claims their proportional refund

## Troubleshooting

### "MaxFeesPerGas" error when signing

MetaMask sometimes miscalculates fees on L2 networks. When the popup appears:

1. Click **Edit** on the gas section
2. Switch to **Advanced**
3. Set **Max base fee** to `0.5 gwei` and **Priority fee** to `0.1 gwei`
4. Try again

If it keeps failing, go to **MetaMask Settings → Advanced → Clear activity tab data** and retry.

### Transaction reverts

Check that:
- You have enough ETH for gas
- You're connected to Arbitrum Sepolia (not mainnet)
- The Factory address is correct

### The app doesn't show my pots

- Confirm you're on Arbitrum Sepolia in MetaMask
- Confirm the Factory address is set correctly
- Try refreshing the page

## Need help?

Open an issue on GitHub: https://github.com/axie10/komon/issues
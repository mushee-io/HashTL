# HashTL — Native Ultra Token Launcher

HashTL has one job: **create fungible tokens on the Ultra blockchain**.

It is intentionally separate from Hashed40, which is the meme launchpad.

## What HashTL does

Creators connect an Ultra Wallet, choose:

- token name
- symbol
- maximum supply
- initial supply
- decimals
- optional metadata URI

and create the token through a native Ultra / Antelope C++ contract.

## Contract actions

| Action | Purpose |
|---|---|
| `launch` | Create a token and issue its initial supply in one action |
| `create` | Create a token without issuing supply |
| `issue` | Mint additional supply up to the maximum |
| `retire` | Burn issuer-held supply |
| `transfer` | Transfer tokens |
| `open` / `close` | Manage token balance rows |
| `setmeta` | Update token metadata |

The token issuer controls future minting. There is no HashTL admin mint backdoor.

## Local Ultra test

Inside Ultra's official developer container:

```bash
bash scripts/test_ultra.sh
```

A successful run compiles `hashedlaunch.wasm/.abi` and tests create, mint, transfer, burn, and duplicate-symbol protection.

## Frontend

```bash
cd web
cp .env.example .env
npm install
npm run dev
```

Set:

```env
VITE_CONTRACT_ACCOUNT=<HASH_TL_TESTNET_ACCOUNT>
```

The web app is Testnet-only for now and checks the Ultra Wallet chain before connecting.

## Scope

HashTL is **not** a meme launchpad, DEX, lending protocol, fundraising launchpad, or bonding-curve product.

Those are separate ecosystem products.

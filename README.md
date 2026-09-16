# Relay

Relay is an invoice settlement reconciliation desk. Operators compare the expected payer, recipient and integer amount with supplied evidence, then may anchor a bounded receipt record on BOT Chain Testnet.

## Run locally

```sh
npm ci --ignore-scripts
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
PORT=8080 npm start
```

The service binds to `0.0.0.0:$PORT`, serves SPA deep links, and exposes `/healthz` with an application revision. Railway build/start commands are `npm ci --ignore-scripts && npm run build` and `npm start`.

## Configuration

Copy `.env.example` to `.env.local` and set `VITE_RELAY_REGISTRY_ADDRESS` to the deployed address from [BOTCHAIN_TESTNET.md](BOTCHAIN_TESTNET.md). The app never guesses an address. `VITE_BOT_CHAIN_ID`, `VITE_BOT_RPC_URL`, and `VITE_BOT_EXPLORER_URL` default to the documented BOT Chain Testnet values. In Railway, set these at build time because Vite embeds `VITE_*` values in the client bundle.

## Contract boundary

The deployed `RelayProofRegistry` has no constructor or role gate. Any account may submit one immutable receipt per invoice ID. It stores the intent hash, source-proof hash, integer amount, recipient, expiry, and accepted flag. It does not store the payer or currency label, inspect evidence, validate another chain, or transfer funds. Match results are client-side comparisons; a receipt is an assertion anchor, not proof that an invoice was paid or a real-world action occurred.

Sample invoices are conspicuously marked fixtures and cannot be written on-chain. User-created intents and observed values remain in browser storage scoped to chain, contract, and connected account. The receipt view reads known invoice IDs from the contract mapping; the contract has no enumeration endpoint or history indexer, so only locally known IDs are listed.

The UI requires an explicit review and wallet action. It checks chain state, simulates `record`, estimates gas, and then asks the wallet to sign. An accepted/rejected choice is immutable for that invoice ID; rejection or malformed metadata cannot be corrected on-chain. Source approval, payer identity, token/currency units and payment settlement are not independently verified by any connected oracle/prover/service.

## Tests and deployment evidence

Run application checks with `npm run typecheck`, `npm test`, `npm run build`; run contract checks with `forge build`, `forge test`. Deployed testnet details and verified explorer link are in [BOTCHAIN_TESTNET.md](BOTCHAIN_TESTNET.md). No production web deployment is claimed here.

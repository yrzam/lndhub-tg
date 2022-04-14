# lndhub-tg
**Multi-user LndHub client implemented as Telegram bot.**

LndHub is a backend solution for Lightning Network custodial wallets. It provides HTTP API, which de-facto became a standard for Lightning accounting. This bot acts like a client for that backend: same as BlueWallet app, but on Telegram. It provides some abstraction and user interaction features, although does not encourage centralization. You should always be able to run your instance of bot and connect to the hub of your choise with minimal drawbacks.

Please remember that the following parties will have full access to your funds: LndHub host owner, Bot instance owner and Telegram. LndHub and this Bot are open source, feel free to host them yourself.

### USE AT YOUR OWN RISK.

> Disclaimer: LndHub is popular production-ready and well-tested software. Although it has many drawbacks: bad request optimisation,  inaccuracies regarding fees, troubles with authorization and rate limiting, low level of abstraction, and, the worst and most important, its source code does not follow provided documentation. I tried to do my best, so this solution supports original LndHub server and alternatives that follow its documentation.

### FEATURES:
- Provides basic wallet functionality (receive, send, backup, view transactions and invoices)
- Backend API requirements are not strict - works well with BlueWallet server, LndHub, LNBits extension, lndhub.go and others
- Allows to add many wallets connected to the hubs of your choice and manage their names, priorities, rate-limits, etc.
- Fast and well-optimized. More cache, less requests
- Implies powerful currency converter with customizable exchange rate offset - define your own value
- Widely uses convenient Telegram client's features
- Has support for fully inline invoices - no need to leave private chats. Send sats in a couple of clicks

### TODO:
- Session restore functionality
- Notification support
- Wide range of admin features, full runtime config support
- More invoice types (abstracted via bot)
- HTTP API
- LNURLp, tip inv support
- More security options (sync access with model)
- Users interaction functionality (groups, paywalls, etc.)
- Web UI with telegram auth

### Setup guide for docker & docker-compose environment
1. Navigate to `run` directory
2. Provide `.env` file according to the [guide](run/env-guide.md)
3. Run `docker-compose up -d`

### Hosted as [@paylnbot](https://t.me/paylnbot) with no guarantees and obligations.
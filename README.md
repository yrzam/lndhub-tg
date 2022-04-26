# lndhub-tg

**Multi-user LndHub client implemented as Telegram bot.**

LndHub is a backend solution for Lightning Network custodial wallets. It provides HTTP API, which de-facto became a standard for Lightning accounting. This bot acts like a client for that backend: same as BlueWallet app, but on Telegram. It provides some abstraction and user interaction features, although does not encourage centralization. You should always be able to run your instance of bot and connect to the hub of your choiсe with minimal drawbacks.

Please remember that the following parties will have full access to your funds: LndHub host owner, Bot instance owner and Telegram. LndHub and this Bot are open source, feel free to host them yourself.

### USE AT YOUR OWN RISK.

> Disclaimer: LndHub is popular production-ready and well-tested software. Although it has many drawbacks: bad request optimisation,  inaccuracies regarding fees, troubles with authorization and rate limiting, low level of abstraction, and, the worst and most important, its source code does not follow provided documentation. I tried to do my best, so this solution supports original LndHub server and alternatives that follow its documentation.

## FEATURES:
- Provides basic wallet functionality (receive, send, backup, view transactions and invoices)
- Backend API requirements are not strict - works well with BlueWallet server, LndHub, LNBits extension, lndhub.go and others
- Allows to add many wallets connected to the hubs of your choice and manage their names, priorities, rate-limits, etc.
- Fast and well-optimized. More cache, less requests
- Implies powerful currency converter with customizable exchange rate offset - define your own value
- Widely uses convenient Telegram client's features
- Has support for fully inline invoices - no need to leave private chats. Send sats in a couple of clicks

### Setup guide for docker & docker-compose environment
1. Clone this repo
2. Navigate to the `run` directory
3. Provide `.env` file according to the [guide](run/env-guide.md)
4. Run `docker-compose up -d`

Want to build locally? Uncomment build-related lines in compose before running step 3.

### Upgrade guide
1. Read [release notes](https://github.com/yrzam/lndhub-tg/releases), make sure you can deal with mentioned upgrade issues if there are any
2. Clone repo if you built code yourself, or just change image version to be pushed from hub
3. Run `docker-compose up -d` (or other command if you do not use compose)

Setup guides for other environments are located [here](./run/custom-setup-guide.md).

### Hosted as [@paylnbot](https://t.me/paylnbot) with no guarantees and obligations.
## Setup guide for custom environments

### In container
1. Build image from source if you want to: `docker build -t your-tag .`, maybe push to your own registry
2. Make sure you have MongoDB 4.2+ instance running
3. Start your container with provided [env variables](./env-guide.md)

There are docker images for linux/amd64 and linux/arm64/v8 archs pushed to [dockerhub](https://hub.docker.com/repository/docker/yrzam/lndhub-tg) and [ghcr.io](https://github.com/yrzam/lndhub-tg/pkgs/container/lndhub-tg).

### Standalone
1. Clone this repo
2. Make sure you have MongoDB 4.2+ instance running
3. Provide `.env` file in `run` directory according to the [guide](./env-guide.md)
4. Run `npm i`
5. Run `npm run build`
6. Run `npm start`

### Dev (VSCode)
1. Clone this repo
2. Make sure you have MongoDB 4.2+ instance running
3. Provide `.env` file in `run` directory according to the [guide](./env-guide.md)
4. Run `npm i`
5. Press `F5`

By default this runs ts-node, although you also switch configuration so that F5 key will run JS code produced by `npm run build`.
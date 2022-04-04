# Configuration guide
Please create `.env` file with environment variables. Its must contain KEY=VALUE pairs, one per line.

### Obligatory
`BOT_TOKEN`=telegram-bot-token <br />
`DEFAULT_HUB_URL`=https://lndhub-host.example <br />

### Also obligatory if launched not from provided docker-compose
`SESSIONS_MONGO_URL`=mongodb://mongo-host.example:27017/lndhub-tg <br />
`MODEL_MONGO_URL`=mongodb://mongo-host.example:27017/lndhub-tg <br />

> Note: You can use the save db for SESSIONS and MODEL. Both SESSIONS and MODEL must be stored privately, although loss of SESSIONS db is not as bad as MODEL. Session acts as a cache and also stores some non-critical data.

### Optional
Override values of [this](../config/custom-environment-variables.json) JSON file
import cacheManager from 'cache-manager';
import { CurrencyService } from './interfaces';
import BlockchainCom from '../../mutable-impls/blockchain-com';

const currService = new CurrencyService({
  api: new BlockchainCom(),
  cache: {
    api: cacheManager.caching({ store: 'memory', max: 100, ttl: 10 }),
    ttl: 600,
  },
});

export default currService;

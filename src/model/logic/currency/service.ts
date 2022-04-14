import cacheManager from 'cache-manager';
import { CurrencyService } from './interfaces';
import { CurrencyAPI } from '../../mutable-impls';

const currService = new CurrencyService({
  api: new CurrencyAPI(),
  cache: {
    api: cacheManager.caching({ store: 'memory', max: 100, ttl: 10 }),
    ttl: 600,
  },
});

export default currService;

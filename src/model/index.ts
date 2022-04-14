import 'reflect-metadata';
import winston from '@utils/logger-service';
import { connectToDb, disconnectFromDb } from './utils/db';

export class Model {
  static async start() {
    winston.info('Initializing model...');
    await connectToDb();
    winston.info('Model ready');
  }

  static async stop() {
    winston.info('Shutting down model...');
    await disconnectFromDb();
    winston.info('Model stopped');
  }
}

export * from './logic/payment';
export * from './logic/currency';
export * from './logic/wallet';
export * from './logic/user';

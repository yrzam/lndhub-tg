import 'reflect-metadata';
import { connectToDb, disconnectFromDb } from './utils/db';

export class Model {
  static async start() {
    await connectToDb();
  }

  static async stop() {
    await disconnectFromDb();
  }
}

export * from './logic/payment';
export * from './logic/currency';
export * from './logic/wallet';
export * from './logic/user';

import mongoose from 'mongoose';
import type MongoStorage from '@satont/grammy-mongodb-storage';

export default class SessionDB {
  private dbUrl: string;

  private collectionName: string;

  private connection?: mongoose.Connection;

  constructor(url: string, collectionMutator = '') {
    this.dbUrl = url;
    this.collectionName = `session-${collectionMutator}`;
  }

  async start(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.connection = mongoose.createConnection(this.dbUrl);
      this.connection.on('connected', () => resolve(undefined));
      this.connection.on('error', (err) => reject(err));
    });
  }

  getSessionStorage() {
    if (!this.connection) throw new Error('No connection');
    return this.connection.db.collection<MongoStorage.ISession>(this.collectionName);
  }

  async stop(): Promise<void> {
    await this.connection?.close();
  }
}

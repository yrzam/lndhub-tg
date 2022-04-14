import winston from '@utils/logger-service';
import mongoose from 'mongoose';
import type MongoStorage from '@satont/grammy-mongodb-storage';

export default class SessionDB {
  private dbUrl: string;

  private collectionName: string;

  private connection?: mongoose.Connection;

  constructor(url: string, collectionMutator = '') {
    this.dbUrl = url;
    this.collectionName = collectionMutator ? `sessions-${collectionMutator}` : 'sessions';
  }

  async start(): Promise<void> {
    winston.debug('Launching bot: connecting to session DB...');
    await new Promise((resolve, reject) => {
      this.connection = mongoose.createConnection(this.dbUrl);
      this.connection.on('connected', () => resolve(undefined));
      this.connection.on('error', (err) => reject(err));
    });
    winston.debug('Launching bot: connection with session DB established');
  }

  getSessionStorage() {
    if (!this.connection) throw new Error('No connection');
    return this.connection.db.collection<MongoStorage.ISession>(this.collectionName);
  }

  async stop(): Promise<void> {
    winston.debug('Stopping bot: disconnecting from session DB.');
    await this.connection?.close();
  }
}

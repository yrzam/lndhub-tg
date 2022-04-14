// not a class because multiple model connections are not allowed

import winston from '@utils/logger-service';
import config from 'config';
import mongoose from 'mongoose';

export async function connectToDb() {
  winston.debug('Connecting to model DB...');
  await mongoose.connect(config.get('model.mongoUrl'));
  winston.debug('Connection with model DB established');
}

export async function disconnectFromDb() {
  winston.debug('Stopping model: disconnecting from DB');
  await mongoose.disconnect();
  winston.debug('Disconnected from model DB');
}

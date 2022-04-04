import config from 'config';
import mongoose from 'mongoose';

export async function connectToDb() {
  await mongoose.connect(config.get('model.mongoUrl'));
}

export async function disconnectFromDb() {
  await mongoose.disconnect();
}

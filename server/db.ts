import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer: MongoMemoryServer | null = null;
let isConnected = false;
let connectionType: 'atlas' | 'local' | 'in-memory' = 'in-memory';

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log('Connecting to MongoDB Atlas / configured URI...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      connectionType = uri.includes('mongodb.net') ? 'atlas' : 'local';
      console.log(`Connected successfully to MongoDB (${connectionType})`);
      return mongoose;
    } catch (err) {
      console.warn('Could not connect to configured MONGODB_URI. Falling back to embedded MongoMemoryServer for resilience:', err);
    }
  }

  // Fallback to MongoMemoryServer so the app runs smoothly with 100% genuine Mongoose schemas & queries
  try {
    console.log('Initializing embedded MongoDB instance (MongoMemoryServer)...');
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'brokecode_db',
      },
    });
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    isConnected = true;
    connectionType = 'in-memory';
    console.log('Connected to embedded MongoDB instance at', memoryUri);
    return mongoose;
  } catch (err) {
    console.error('Fatal error connecting to MongoDB:', err);
    throw err;
  }
}

export function getConnectionStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    connectionType,
    readyState: mongoose.connection.readyState,
    databaseName: mongoose.connection.name || 'brokecode_db',
  };
}

export async function closeDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
  isConnected = false;
}

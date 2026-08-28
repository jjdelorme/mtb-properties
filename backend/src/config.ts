import dotenv from 'dotenv';
import path from 'path';

// Load from backend/.env first, then root .env if not found
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  PORT: process.env.PORT || 4000,
  RENTCAST_API_KEY: process.env.RENTCAST_API_KEY || '',
};

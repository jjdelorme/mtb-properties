import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  PORT: process.env.PORT || 4000,
  RENTCAST_API_KEY: process.env.RENTCAST_API_KEY || '',
};

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { searchController } from './controllers/searchController';

export const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/search', searchController);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`Server running on http://localhost:${config.PORT}`);
  });
}

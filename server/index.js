import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = createApp();
const PORT = 3001;

app.listen(PORT, () => {
  console.log(`The Panel server listening on http://localhost:${PORT}`);
});

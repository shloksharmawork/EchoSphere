import { cpSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = join(__dirname, 'drizzle');
const destination = join(__dirname, 'dist', 'drizzle');

cpSync(source, destination, { recursive: true });
console.log('✓ Copied drizzle migrations to dist/');

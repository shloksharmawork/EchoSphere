import { cpSync } from 'fs';
import { join } from 'path';

const source = join(process.cwd(), 'drizzle');
const destination = join(process.cwd(), 'dist', 'drizzle');

cpSync(source, destination, { recursive: true });
console.log('✓ Copied drizzle migrations to dist/');

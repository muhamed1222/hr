import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

const SRC_DIR = path.join(process.cwd(), 'src');
const TEST_DIR = path.join(process.cwd(), 'tests');

async function renameToTypeScript(filePath: string): Promise<void> {
  if (filePath.endsWith('.js')) {
    const newPath = filePath.replace('.js', '.ts');
    await fs.promises.rename(filePath, newPath);
    console.log(`Renamed ${filePath} to ${newPath}`);
  } else if (filePath.endsWith('.jsx')) {
    const newPath = filePath.replace('.jsx', '.tsx');
    await fs.promises.rename(filePath, newPath);
    console.log(`Renamed ${filePath} to ${newPath}`);
  }
}

async function processDirectory(dirPath: string): Promise<void> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      await renameToTypeScript(fullPath);
    }
  }
}

async function main() {
  try {
    console.log('Starting TypeScript migration...');

    // Переименовываем файлы
    console.log('Renaming files...');
    await processDirectory(SRC_DIR);
    if (fs.existsSync(TEST_DIR)) {
      await processDirectory(TEST_DIR);
    }

    // Запускаем TypeScript для проверки типов
    console.log('Running type check...');
    try {
      await execAsync('pnpm run typecheck');
      console.log('Type check completed successfully');
    } catch (error) {
      console.error('Type check failed. Please fix the type errors manually.');
      console.error(error.stdout);
    }

    console.log('Migration completed!');
    console.log('Next steps:');
    console.log('1. Fix any type errors reported by the type checker');
    console.log('2. Add proper type annotations to your code');
    console.log('3. Update import/export statements to use TypeScript syntax');
    console.log('4. Run tests to ensure everything works correctly');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main(); 
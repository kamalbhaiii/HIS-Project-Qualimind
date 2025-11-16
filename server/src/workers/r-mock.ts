import fs from 'fs/promises';

export async function mockRProcess(storagePath: string) {
  const raw = await fs.readFile(storagePath, 'utf-8');

  return {
    summary: {
      length: raw.length,
      lines: raw.split('\n').length,
    },
    preview: raw.substring(0, 200),
  };
}

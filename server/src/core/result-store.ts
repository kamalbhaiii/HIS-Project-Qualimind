import { redis } from '@loaders/redis';
import cfg from '@config/index';
import fs from "fs/promises";
import path from "path";
import { parse as json2csv } from "json2csv";
import {parse as csvParse} from "csv-parse/sync";

const PROCESSED_DIR = path.join(process.cwd(), cfg.multer.save);

export async function saveProcessedResult(
  processingJobId: string,
  result: unknown
): Promise<string> {
  const key = `processed:${processingJobId}`;
  await redis.set(key, JSON.stringify(result), 'EX', 60 * 60 * 24); // 24h
  return key;
}

export async function getProcessedResult(key: string) {
  const filePath = path.join(PROCESSED_DIR, `${key}.csv`);

  await fs.mkdir(PROCESSED_DIR, { recursive: true });

  const raw = await redis.get(key);

  if (raw) {
    const data = JSON.parse(raw);

    const csv = json2csv(data);

    await fs.writeFile(filePath, csv, "utf8");

    return data;
  }

  try {
    const fileContent = await fs.readFile(filePath, "utf8");

    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    return records;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

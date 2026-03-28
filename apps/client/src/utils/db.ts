import Dexie, { type Table } from "dexie";

export interface OutboxRequest {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
}

export class KduFootDB extends Dexie {
  outbox!: Table<OutboxRequest>;
  cache!: Table<CacheEntry>;

  constructor() {
    super("KduFootDB");
    this.version(1).stores({
      outbox: "++id, timestamp",
      cache: "key, timestamp",
    });
  }
}

export const db = new KduFootDB();

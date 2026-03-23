import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * File-based KV store that mimics the Cloudflare KV API.
 * Data is stored as individual files in a directory.
 */
export class FileKVStore {
  constructor(dir) {
    this.dir = dir;
    this._ready = mkdir(dir, { recursive: true });
  }

  _path(key) {
    // Encode key to safe filename
    return join(this.dir, encodeURIComponent(key));
  }

  async get(key, type) {
    await this._ready;
    try {
      const buf = await readFile(this._path(key));
      if (type === "arrayBuffer") {
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
      return buf.toString("utf-8");
    } catch {
      return null;
    }
  }

  async put(key, value, _options) {
    await this._ready;
    const data =
      value instanceof ArrayBuffer
        ? Buffer.from(value)
        : typeof value === "string"
          ? value
          : Buffer.from(value);
    await writeFile(this._path(key), data);
  }

  async delete(key) {
    await this._ready;
    try {
      await unlink(this._path(key));
    } catch {
      // ignore if not exists
    }
  }
}

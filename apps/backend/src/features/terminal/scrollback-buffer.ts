/**
 * Circular buffer for terminal scrollback.
 * Stores raw terminal output (Uint8Array) with a fixed line limit.
 */
export class ScrollbackBuffer {
  private buffer: Uint8Array[] = [];
  private head = 0;
  private count = 0;

  constructor(private readonly maxLines: number = 10000) {
    if (maxLines <= 0) {
      throw new Error("maxLines must be positive");
    }
  }

  /**
   * Add a chunk of terminal output to the buffer.
   * If buffer is full, overwrites oldest entry.
   */
  push(data: Uint8Array): void {
    if (this.count < this.maxLines) {
      this.buffer.push(data);
      this.count++;
    } else {
      this.buffer[this.head] = data;
      this.head = (this.head + 1) % this.maxLines;
    }
  }

  /**
   * Iterate all entries in insertion order (oldest first).
   */
  *iter(): Generator<Uint8Array> {
    if (this.count === 0) return;

    if (this.count < this.maxLines) {
      // Buffer not full yet - iterate from 0 to count
      for (let i = 0; i < this.count; i++) {
        yield this.buffer[i];
      }
    } else {
      // Buffer full - iterate from head to end, then 0 to head
      for (let i = this.head; i < this.maxLines; i++) {
        yield this.buffer[i];
      }
      for (let i = 0; i < this.head; i++) {
        yield this.buffer[i];
      }
    }
  }

  /**
   * Get all entries as array (for convenience, though iter() is preferred).
   */
  toArray(): Uint8Array[] {
    return Array.from(this.iter());
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.buffer = [];
    this.head = 0;
    this.count = 0;
  }

  /**
   * Current number of stored entries.
   */
  get size(): number {
    return this.count;
  }

  /**
   * Total memory usage estimate in bytes (approximate).
   */
  get memoryUsage(): number {
    let total = 0;
    for (const chunk of this.buffer) {
      total += chunk.byteLength;
    }
    return total;
  }
}

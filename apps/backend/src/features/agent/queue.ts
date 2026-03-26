/**
 * Async event queue for streaming responses.
 * Buffers events and resolves them asynchronously.
 */
export class AsyncEventQueue<T> {
  private items: T[] = [];
  private resolvers: Array<(value: T | null) => void> = [];
  private closed = false;
  private id = Math.random().toString(36).slice(2, 8);

  push(item: T) {
    if (this.closed) {
      console.error(`[Queue ${this.id}] PUSH REJECTED (closed):`, item);
      return;
    }

    const resolver = this.resolvers.shift();
    if (resolver) {
      console.log(`[Queue ${this.id}] PUSH (resolver):`, (item as { type?: string }).type);
      resolver(item);
      return;
    }

    console.log(
      `[Queue ${this.id}] PUSH (buffered):`,
      (item as { type?: string }).type,
      `items=${this.items.length + 1}`,
    );
    this.items.push(item);
  }

  isClosed() {
    return this.closed;
  }

  close() {
    if (this.closed) {
      console.log(`[Queue ${this.id}] CLOSE (already closed)`);
      return;
    }
    this.closed = true;
    console.log(
      `[Queue ${this.id}] CLOSE (resolvers=${this.resolvers.length}, items=${this.items.length})`,
    );

    while (this.resolvers.length > 0) {
      this.resolvers.shift()?.(null);
    }
  }

  async next(): Promise<T | null> {
    if (this.items.length > 0) {
      const item = this.items.shift() ?? null;
      console.log(`[Queue ${this.id}] NEXT (item):`, (item as { type?: string })?.type);
      return item;
    }

    if (this.closed) {
      console.log(`[Queue ${this.id}] NEXT (null, closed)`);
      return null;
    }

    console.log(`[Queue ${this.id}] NEXT (waiting)`);
    return new Promise((resolve) => {
      this.resolvers.push((value) => {
        console.log(
          `[Queue ${this.id}] NEXT (resolved):`,
          (value as { type?: string })?.type ?? "null",
        );
        resolve(value);
      });
    });
  }
}

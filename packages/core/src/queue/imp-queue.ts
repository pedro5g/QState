import type { Queue } from '../types';

export abstract class ImpQueue<TData> implements Queue<TData> {
  protected queue: TData[] = [];
  protected processing: boolean = false;

  enqueue(data: TData): void {
    this.queue.push(data);
    this.scheduleProcess();
  }

  private scheduleProcess() {
    if (this.processing) return; // it's processing
    this.processing = true;
    // schedule "microtask" that running before current call stack
    // but after ti next macrotask.

    // https://javascript.info/event-loop
    Promise.resolve().then(() => {
      try {
        this.process();
      } finally {
        this.processing = false;
      }
    });
  }

  abstract process(): void;
}

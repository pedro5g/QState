import { ImpQueue } from '../../src/queue';

class TestQueue extends ImpQueue<string> {
  process = vi.fn(() => {
    this.queue.length = 0;
  });
}

describe('ImpQueue', () => {
  let sut: TestQueue;

  beforeEach(() => {
    sut = new TestQueue();
  });

  it('should enqueue data', () => {
    sut.enqueue('item-1');
    expect(sut['queue']).toHaveLength(1);
    expect(sut['queue'][0]).toBe('item-1');
  });

  it('should call process() once after microtask even if multiple enqueue are called synchronously', async () => {
    const spy = sut.process;

    sut.enqueue('a');
    sut.enqueue('b');
    sut.enqueue('c');

    expect(spy).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should reset processing flag after process finishes', async () => {
    sut.enqueue('x');
    expect(sut['processing']).toBe(true);

    await Promise.resolve();

    expect(sut['processing']).toBe(false);
  });

  it('should clear the queue after process', async () => {
    sut.enqueue('task');
    await Promise.resolve();
    expect(sut['queue']).toHaveLength(0);
  });

  it('should be able to process new tasks after first cycle completes', async () => {
    sut.enqueue('task-1');
    await Promise.resolve();
    expect(sut.process).toHaveBeenCalledTimes(1);

    sut.enqueue('task-2');
    await Promise.resolve();
    expect(sut.process).toHaveBeenCalledTimes(2);
  });

  it('should not schedule multiple processes while already processing', async () => {
    sut['processing'] = true;
    const spy = sut.process;

    sut.enqueue('t1');
    sut.enqueue('t2');

    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });
});

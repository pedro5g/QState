import {
  readParam,
  writeParam,
  subscribeQS,
} from '../../src/query-manager/accessor';
import { queryManager } from '../../src/query-manager/query-manager.factory';

vi.mock('../../src/utils', () => ({
  isClientSide: vi.fn(() => true),
}));

vi.mock('../../src/query-manager/query-manager.factory', () => ({
  queryManager: {
    update: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('accessor: readParam', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.com/?foo=1&keep=5',
        search: '?foo=1&keep=5',
      },
    });
  });

  it('should read the value on query string by received key', () => {
    const foo = readParam('foo');
    const keep = readParam('keep');

    expect(foo).toBe('1');
    expect(keep).toBe('5');
  });

  it('should return null if the key is not found', () => {
    const param = readParam('invalid');
    expect(param).toBeNull();
  });

  it('should return null if not client-side', async () => {
    const { isClientSide } = await import('../../src/utils');
    (isClientSide as any).mockReturnValue(false);

    const param = readParam('foo');
    expect(param).toBeNull();

    (isClientSide as any).mockReturnValue(true);
  });
});

describe('accessor: writeParam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.com',
        search: '',
      },
    });
  });

  it('should call queryManager.update with correct args', () => {
    writeParam('foo', 'bar', 'replace', {
      rateLimit: 100,
      something: true,
    } as any);

    expect(queryManager.update).toHaveBeenCalledWith(
      'foo',
      'bar',
      'replace',
      { something: true },
      100
    );
  });

  it('should not call update if not client-side', async () => {
    const { isClientSide } = await import('../../src/utils');
    (isClientSide as any).mockReturnValue(false);

    writeParam('foo', 'bar');
    expect(queryManager.update).not.toHaveBeenCalled();

    (isClientSide as any).mockReturnValue(true);
  });
});

describe('accessor: subscribeQS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call queryManager.subscribe with correct args', () => {
    const callback = vi.fn();
    subscribeQS(callback, 'foo');

    expect(queryManager.subscribe).toHaveBeenCalledWith('foo', callback);
  });

  it('should return empty function if not client-side', async () => {
    const { isClientSide } = await import('../../src/utils');
    (isClientSide as any).mockReturnValue(false);

    const unsub = subscribeQS(() => {}, 'bar');
    expect(unsub).toBeTypeOf('function');
    expect(unsub()).toBeUndefined();
    expect(queryManager.subscribe).not.toHaveBeenCalled();

    (isClientSide as any).mockReturnValue(true);
  });
});

vi.mock('../../src/patch', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    ImpHistoryPatch: vi.fn(() => ({ type: 'historyPatch' })),
  };
});

vi.mock('../../src/queue', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    ImpQueryQueue: vi.fn(() => ({ type: 'queryQueue' })),
  };
});

vi.mock('../../src/rate-limiter', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    ImpRateLimiter: vi.fn(() => ({ type: 'rateLimiter' })),
  };
});

vi.mock('../../src/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    isClientSide: vi.fn(),
  };
});

describe('createQueryManager', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should return null when isClientSide is false', async () => {
    const { isClientSide } = await import('../../src/utils');
    (isClientSide as any).mockReturnValue(false);

    const { createQueryManager } = await import('../../src/query-manager');
    const result = createQueryManager();

    expect(result).toBeNull();
  });

  it('should create new ImpQueryManager if not already present', async () => {
    const { isClientSide } = await import('../../src/utils');
    const { ImpHistoryPatch } = await import('../../src/patch');
    const { ImpQueryQueue } = await import('../../src/queue');
    const { ImpRateLimiter } = await import('../../src/rate-limiter');
    (isClientSide as any).mockReturnValue(true);

    const { createQueryManager } = await import('../../src/query-manager');
    const instance = createQueryManager();

    expect(ImpHistoryPatch).toHaveBeenCalledTimes(1);
    expect(ImpRateLimiter).toHaveBeenCalledTimes(1);
    expect(ImpQueryQueue).toHaveBeenCalledTimes(1);
    expect(instance).toMatchObject({
      historyPatch: { type: 'historyPatch' },
      rateLimiter: { type: 'rateLimiter' },
      queryQueue: { type: 'queryQueue' },
    });
  });

  it('should reuse same instance (singleton)', async () => {
    const { isClientSide } = await import('../../src/utils');
    (isClientSide as any).mockReturnValue(true);

    const { createQueryManager } = await import('../../src/query-manager');
    const instance1 = createQueryManager();
    const instance2 = createQueryManager();

    expect(instance1).toBe(instance2);
  });

  it('should export a valid singleton as queryManager', async () => {
    const { isClientSide } = await import('../../src/utils');
    (isClientSide as any).mockReturnValue(true);

    const { queryManager, createQueryManager } = await import(
      '../../src/query-manager'
    );
    expect(queryManager).toBe(createQueryManager());
  });
});

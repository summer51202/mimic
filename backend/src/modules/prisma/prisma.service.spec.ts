import { PrismaService } from './prisma.service';

describe('PrismaService lifecycle', () => {
  it('does not eagerly connect during Nest module initialization', () => {
    expect(
      (PrismaService.prototype as { onModuleInit?: unknown }).onModuleInit,
    ).toBeUndefined();
  });

  it('disconnects when the Nest module is destroyed', async () => {
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const service = Object.create(PrismaService.prototype) as PrismaService;
    service.$disconnect = disconnect;

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

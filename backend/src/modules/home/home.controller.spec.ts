import { HomeController } from './home.controller';

describe('HomeController', () => {
  it('keeps home context and task actor on the authenticated user', async () => {
    const service = {
      home: jest.fn().mockResolvedValue({ context: { kind: 'PERSONAL' }, cards: [], task_count: 0 }),
      tasks: jest.fn().mockResolvedValue({ items: [], count: 0 }),
    };
    const controller = new HomeController(service as never);

    const actor = { userId: 'actor', email: 'actor@example.test' };
    await expect(controller.home(actor, undefined)).resolves.toMatchObject({ data: { cards: [] } });
    await expect(controller.tasks(actor)).resolves.toMatchObject({ data: { count: 0 } });
    expect(service.home).toHaveBeenCalledWith('actor', undefined);
    expect(service.tasks).toHaveBeenCalledWith('actor');
  });
});

import { assertSpacesTestDatabase } from './financial-spaces-db';
describe('financial spaces test database guard', () => {
  it.each([undefined, '', 'bad-url', 'postgresql://remote.example/mimic_financial_spaces_test',
    'https://localhost/mimic_financial_spaces_test', 'postgresql://localhost/production'])('rejects %s', value => {
    expect(() => assertSpacesTestDatabase(value)).toThrow('LOCAL_SPACES_TEST_DATABASE_REQUIRED');
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])('accepts loopback %s', host => {
    expect(() => assertSpacesTestDatabase(`postgresql://${host}:55439/mimic_financial_spaces_test?schema=phase2`)).not.toThrow();
  });
});

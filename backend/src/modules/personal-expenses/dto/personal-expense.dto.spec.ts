import { RequestValidationPipe } from '../../../common/pipes/request-validation.pipe';
import { CreatePersonalExpenseDto, UpdatePersonalExpenseDto } from './personal-expense.dto';
const pipe = new RequestValidationPipe();
const valid = { request_id: '00000000-0000-4000-8000-000000000001', amount_minor: '125', occurred_on: '2026-09-11', title: 'Lunch' };
describe('strict personal expense input', () => {
  it.each([{ amount_minor: 125 }, { amount_minor: '1.25' }, { amount_minor: '0' }, { title: '' },
    { currency: 'TWD' }, { payers: [] }, { allocations: [] }, { payment_source: 'FUND' }, { note: 123 },
    { tag_ids: ['bad'] }, { request_id: 'bad' }])('rejects %j', value => {
    return expect(pipe.transform({ ...valid, ...value }, { type: 'body', metatype: CreatePersonalExpenseDto })).rejects.toThrow();
  });
  it('accepts large exact amount and nullable note', () => {
    return expect(pipe.transform({ ...valid, amount_minor: '9007199254740993', note: null }, { type: 'body', metatype: CreatePersonalExpenseDto }))
      .resolves.toMatchObject({ amount_minor: '9007199254740993', note: null });
  });
  it('requires an integer record version for replacement', () => {
    return expect(pipe.transform({ ...valid, version: 1.5 }, { type: 'body', metatype: UpdatePersonalExpenseDto })).rejects.toThrow();
  });
});

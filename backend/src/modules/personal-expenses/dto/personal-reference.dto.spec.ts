import { RequestValidationPipe } from '../../../common/pipes/request-validation.pipe';
import {
  CreatePersonalReferenceDto,
  RemovePersonalReferenceDto,
  UpdatePersonalReferenceDto,
} from './personal-reference.dto';

const pipe = new RequestValidationPipe();
const requestId = '00000000-0000-4000-8000-000000000001';
const sourceId = '00000000-0000-4000-8000-000000000002';

describe('strict personal reference input', () => {
  it('accepts only private metadata when creating a source link', async () => {
    await expect(
      pipe.transform(
        { request_id: requestId, source_expense_id: sourceId, tag_ids: [sourceId], note: null },
        { type: 'body', metatype: CreatePersonalReferenceDto },
      ),
    ).resolves.toMatchObject({ source_expense_id: sourceId, note: null });
  });

  it.each([
    { request_id: 'bad' },
    { source_expense_id: 'bad' },
    { tag_ids: [sourceId, sourceId] },
    { tag_ids: Array.from({ length: 21 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`) },
    { note: 'x'.repeat(2001) },
    { amount_minor: '100' },
    { title: 'copied title' },
    { category_id: sourceId },
    { currency: 'TWD' },
  ])('rejects invalid or source-owned create field %j', value => {
    return expect(
      pipe.transform(
        { request_id: requestId, source_expense_id: sourceId, ...value },
        { type: 'body', metatype: CreatePersonalReferenceDto },
      ),
    ).rejects.toThrow('SPACE_INPUT_INVALID');
  });

  it('requires safe integer versions for update and remove', async () => {
    await expect(
      pipe.transform(
        { request_id: requestId, version: 1, note: 'private' },
        { type: 'body', metatype: UpdatePersonalReferenceDto },
      ),
    ).resolves.toMatchObject({ version: 1, note: 'private' });
    await expect(
      pipe.transform(
        { request_id: requestId, version: Number.MAX_SAFE_INTEGER + 1 },
        { type: 'body', metatype: RemovePersonalReferenceDto },
      ),
    ).rejects.toThrow('SPACE_INPUT_INVALID');
  });
});

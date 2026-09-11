import { minimumTransfers, MAX_SETTLEMENT_POSITIONS } from './minimum-transfers';
import { MemberAmount } from '../shared-expenses/shared-accounting';

const positions = (amounts: bigint[]): MemberAmount[] => amounts.map((amountMinor, index) => ({ userId: String(index), amountMinor }));

function verifyReplay(input: MemberAmount[]): void {
  const original = new Map(input.map(row => [row.userId, row.amountMinor]));
  const remaining = new Map(original);
  for (const transfer of minimumTransfers(input)) {
    expect(transfer.amountMinor > 0n).toBe(true);
    expect(original.get(transfer.fromUserId)! < 0n).toBe(true);
    expect(original.get(transfer.toUserId)! > 0n).toBe(true);
    remaining.set(transfer.fromUserId, remaining.get(transfer.fromUserId)! + transfer.amountMinor);
    remaining.set(transfer.toUserId, remaining.get(transfer.toUserId)! - transfer.amountMinor);
  }
  expect([...remaining.values()].every(amount => amount === 0n)).toBe(true);
}

// Independent exhaustive partition oracle: enumerate zero-sum groups containing
// the first member, then recurse on the unchosen members.
function maximumGroups(values: bigint[]): number {
  if (!values.length) return 0;
  let best = 0;
  for (let mask = 1; mask < 2 ** values.length; mask += 2) {
    let sum = 0n;
    const remaining: bigint[] = [];
    values.forEach((value, index) => {
      if (mask & (1 << index)) sum += value;
      else remaining.push(value);
    });
    if (sum === 0n) best = Math.max(best, 1 + maximumGroups(remaining));
  }
  return best;
}

describe('exact minimum shared transfers', () => {
  it('directs payments from debtor to creditor', () => {
    expect(minimumTransfers(positions([600n, -600n]))).toEqual([
      { fromUserId: '1', toUserId: '0', amountMinor: 600n },
    ]);
  });
  it('beats largest-first greedy matching on a counterexample', () => {
    const input = positions([-8n, -7n, -5n, 10n, 8n, 2n]);
    expect(minimumTransfers(input)).toHaveLength(4);
    verifyReplay(input);
  });
  it('returns no transfers for empty or zero positions', () => {
    expect(minimumTransfers([])).toEqual([]);
    expect(minimumTransfers(positions([0n, 0n]))).toEqual([]);
  });
  it('is deterministic regardless of input ordering and does not mutate input', () => {
    const input = positions([-8n, -7n, -5n, 10n, 8n, 2n]);
    const frozen = Object.freeze(input.map(row => Object.freeze({ ...row })));
    expect(minimumTransfers(frozen)).toEqual(minimumTransfers([...input].reverse()));
  });
  it('preserves bigint precision above both Number and row-storage ranges', () => {
    const large = 9223372036854775808n;
    expect(minimumTransfers(positions([-large, large]))[0].amountMinor).toBe(large);
  });
  it('rejects an unbalanced set', () => {
    expect(() => minimumTransfers(positions([-1n, 2n]))).toThrow('SHARED_POSITIONS_UNBALANCED');
  });
  it('rejects duplicate or empty identities, including zero positions', () => {
    expect(() => minimumTransfers([{ userId: 'A', amountMinor: 0n }, { userId: 'A', amountMinor: 0n }]))
      .toThrow('SHARED_INPUT_INVALID');
    expect(() => minimumTransfers([{ userId: '', amountMinor: 0n }])).toThrow('SHARED_INPUT_INVALID');
  });
  it('supports the explicit 16-member bound with no approximate fallback', () => {
    expect(MAX_SETTLEMENT_POSITIONS).toBe(16);
    const input = positions([...Array<bigint>(8).fill(-1n), ...Array<bigint>(8).fill(1n)]);
    expect(minimumTransfers(input)).toHaveLength(8);
    verifyReplay(input);
  });
  it('rejects more than 16 nonzero positions', () => {
    expect(() => minimumTransfers(positions([...Array<bigint>(16).fill(-1n), 16n])))
      .toThrow('SHARED_SETTLEMENT_LIMIT');
  });
  it('does not count zero positions against the search bound', () => {
    expect(minimumTransfers(positions([...Array<bigint>(20).fill(0n), -1n, 1n]))).toHaveLength(1);
  });
  it('matches an independent exhaustive oracle and conserves every generated position', () => {
    for (let a = -2n; a <= 2n; a++) for (let b = -2n; b <= 2n; b++) {
      for (let c = -2n; c <= 2n; c++) for (let d = -2n; d <= 2n; d++) {
        const values = [a, b, c, d, 1n, -a - b - c - d - 1n].filter(value => value !== 0n);
        const input = positions(values);
        expect(minimumTransfers(input)).toHaveLength(values.length - maximumGroups(values));
        verifyReplay(input);
      }
    }
  });
});

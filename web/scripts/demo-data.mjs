#!/usr/bin/env node
// Demo data for manual review of mimic (local or staging).
//
// Usage:
//   node scripts/demo-data.mjs --base http://127.0.0.1:3001 [--state .tmp/demo-data/local.json]
//                              [--password <pw>] [--locale zh-TW|en|ja]
//
// It goes through the web app's own routes (/api/auth/*, /api/app/*), so the same
// command works against a local `next start` and against staging. Run it again on a
// later day to add the shared-expense corrections: a correction needs a completed
// settlement round whose cutoff is before today, and a chest can only be backdated to
// the day it was opened.
//
// State (accounts, ids, finished steps) is kept in the --state file so reruns are
// idempotent and reuse the same accounts. The state file holds the demo password: keep
// it under .tmp/ (ignored by git).

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]?.startsWith('--') ? 'true' : all[index + 1] ?? 'true']);
  return pairs;
}, []));
if (!args.base) {
  console.error('Missing --base, e.g. --base http://127.0.0.1:3001');
  process.exit(2);
}
const base = args.base.replace(/\/+$/, '');
const statePath = args.state ?? '.tmp/demo-data/state.json';
const timezone = 'Asia/Taipei';
const locale = args.locale ?? 'zh-TW';

const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { steps: {} };
function save() {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}
async function step(name, run) {
  if (state.steps[name]) return state.steps[name];
  const result = (await run()) ?? true;
  state.steps[name] = result;
  save();
  console.log(`✓ ${name}`);
  return result;
}

function today() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
}

class Session {
  constructor(label) { this.label = label; this.cookies = new Map([['mimic-locale', locale]]); }
  cookieHeader() { return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; '); }
  remember(response) {
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      if (/max-age=0/i.test(line) || value === '') this.cookies.delete(name); else this.cookies.set(name, value);
    }
  }
  async csrf() {
    if (!this.cookies.get('mimic_csrf')) {
      const response = await fetch(`${base}/api/auth/csrf`, { headers: { cookie: this.cookieHeader() } });
      this.remember(response);
    }
    return this.cookies.get('mimic_csrf');
  }
  async request(method, path, body) {
    const csrf = method === 'GET' ? undefined : await this.csrf();
    const headers = { cookie: this.cookieHeader(), accept: 'application/json' };
    if (csrf) { headers['x-csrf-token'] = csrf; headers['content-type'] = 'application/json'; }
    const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    this.remember(response);
    const text = await response.text();
    let json; try { json = JSON.parse(text); } catch { json = { text }; }
    if (!response.ok) throw new Error(`${this.label} ${method} ${path} → ${response.status} ${text.slice(0, 300)}`);
    return json;
  }
  async data(method, path, body) { return (await this.request(method, path, body)).data; }
}

async function signIn(session, account) {
  let result;
  try {
    result = await session.request('POST', '/api/auth/login', { email: account.email, password: account.password });
  } catch (error) {
    if (!/→ 401|→ 400|→ 404/.test(String(error))) throw error;
    result = await session.request('POST', '/api/auth/register', { displayName: account.displayName, email: account.email, password: account.password });
  }
  account.id = result.user.id;
  return result.user;
}

const owner = new Session('owner');
const partner = new Session('partner');

async function space(id) { return owner.data('GET', `/api/app/spaces/${id}`); }
async function addPartner(spaceId) {
  const current = await space(spaceId);
  await owner.data('POST', `/api/app/spaces/${spaceId}/participants`, { user_id: state.partner.id, version: current.version });
}
function rid() { return randomUUID(); }

async function main() {
  const slug = state.slug ?? (state.slug = new Date().toISOString().slice(0, 10).replaceAll('-', '') + Math.random().toString(36).slice(2, 6));
  const password = state.password ?? (state.password = args.password ?? `demo-${randomUUID().slice(0, 12)}`);
  state.owner ??= { displayName: '展示隊長', email: `demo-owner-${slug}@example.com`, password };
  state.partner ??= { displayName: '展示夥伴', email: `demo-partner-${slug}@example.com`, password };
  save();
  await signIn(owner, state.owner);
  await signIn(partner, state.partner);
  save();
  const date = today();

  const group = await step('group', async () => {
    const created = await owner.data('POST', '/api/app/groups', { name: `公會展示 ${slug.slice(0, 8)}`, group_type: 'group', default_currency: 'TWD' });
    const invite = await owner.data('POST', `/api/app/groups/${created.id}/invites`, {});
    await partner.data('POST', '/api/app/group-invites/accept', { invite_code: invite.invite_code });
    return { id: created.id };
  });

  await step('personal', async () => {
    const spaces = await owner.data('GET', '/api/app/me/spaces');
    let personal = spaces.find(item => item.mode === 'PERSONAL_EXPENSES' && item.access === 'PARTICIPANT');
    if (!personal) personal = await owner.data('POST', '/api/app/me/spaces', { name: '我的展示寶箱', mode: 'PERSONAL_EXPENSES', currency: 'TWD', timezone });
    for (const [title, amount] of [['早餐', '85'], ['捷運', '30'], ['晚餐', '260']]) {
      await owner.data('POST', `/api/app/spaces/${personal.id}/personal-expenses`, { request_id: rid(), amount_minor: amount, occurred_on: date, title });
    }
    return { id: personal.id };
  });

  // Shared chest A: balanced expenses today; tomorrow the script settles the opening day and adds corrections.
  const correctionChest = await step('shared-corrections:create', async () => {
    const created = await owner.data('POST', `/api/app/groups/${group.id}/spaces`, { name: '展示：更正紀錄', mode: 'SHARED_EXPENSES', currency: 'TWD', timezone });
    await addPartner(created.id);
    const expenses = {};
    for (const [key, title] of [['corrected', '會更正的支出'], ['voided', '會作廢的支出'], ['plain', '沒有更正的支出']]) {
      const expense = await owner.data('POST', `/api/app/spaces/${created.id}/shared-expenses`, {
        request_id: rid(), amount_minor: '1000', occurred_on: date, title,
        payers: [{ user_id: state.owner.id, amount_minor: '1000' }], allocations: [{ user_id: state.owner.id, amount_minor: '1000' }],
      });
      expenses[key] = (expense.record ?? expense).id;
    }
    return { id: created.id, openedOn: (await space(created.id)).opened_on, expenses };
  });

  // Shared chest B: a pending settlement round whose transfer is paid but not yet received.
  await step('shared-settlement', async () => {
    const created = await owner.data('POST', `/api/app/groups/${group.id}/spaces`, { name: '展示：結算批次', mode: 'SHARED_EXPENSES', currency: 'TWD', timezone });
    await addPartner(created.id);
    await owner.data('POST', `/api/app/spaces/${created.id}/shared-expenses`, {
      request_id: rid(), amount_minor: '600', occurred_on: date, title: '一起吃的晚餐',
      payers: [{ user_id: state.owner.id, amount_minor: '600' }],
      allocations: [{ user_id: state.owner.id, amount_minor: '300' }, { user_id: state.partner.id, amount_minor: '300' }],
    });
    const batch = await owner.data('POST', `/api/app/spaces/${created.id}/shared-settlements`, { request_id: rid(), version: (await space(created.id)).version, period_end: date });
    const transfer = batch.transfers[0];
    await partner.data('POST', `/api/app/spaces/${created.id}/shared-settlements/${batch.id}/transfers/${transfer.id}/sent`, { request_id: rid(), version: transfer.version });
    return { id: created.id };
  });

  // Pooled chest A: open contributions, a fund expense and an unpaid advance.
  await step('pooled-active', async () => {
    const created = await owner.data('POST', `/api/app/groups/${group.id}/spaces`, { name: '展示：共同基金', mode: 'POOLED_FUND', currency: 'TWD', timezone });
    await addPartner(created.id);
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/commitments`, {
      request_id: rid(), version: (await space(created.id)).version, name: '每月公基金', cadence: 'MONTHLY', interval: 1,
      starts_on: date, ends_on: null, generate_through: date, default_amount_minor: '1000', overrides: [],
    });
    let workspace = await owner.data('GET', `/api/app/spaces/${created.id}/pooled-funds/workspace`);
    const mine = workspace.commitments[0].occurrences.find(item => item.participant_user_id === state.owner.id);
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/occurrences/${mine.id}/confirm`, { request_id: rid(), version: mine.version });
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/expenses`, { request_id: rid(), amount_minor: '200', occurred_on: date, title: '露營場地費', payment_source: 'FUND_PAID' });
    await partner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/expenses`, {
      request_id: rid(), amount_minor: '300', occurred_on: date, title: '夥伴先墊的食材', payment_source: 'PARTICIPANT_ADVANCED', advanced_by_user_id: state.partner.id,
    });
    workspace = await owner.data('GET', `/api/app/spaces/${created.id}/pooled-funds/workspace`);
    return { id: created.id };
  });

  // Pooled chest B: closing with a return plan, one return sent.
  await step('pooled-closing', async () => {
    const created = await owner.data('POST', `/api/app/groups/${group.id}/spaces`, { name: '展示：結清退回', mode: 'POOLED_FUND', currency: 'TWD', timezone });
    await addPartner(created.id);
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/commitments`, {
      request_id: rid(), version: (await space(created.id)).version, name: '旅費', cadence: 'MONTHLY', interval: 1,
      starts_on: date, ends_on: null, generate_through: date, default_amount_minor: '500', overrides: [],
    });
    const workspace = await owner.data('GET', `/api/app/spaces/${created.id}/pooled-funds/workspace`);
    for (const occurrence of workspace.commitments[0].occurrences) {
      const session = occurrence.participant_user_id === state.owner.id ? owner : partner;
      await session.data('POST', `/api/app/spaces/${created.id}/pooled-funds/occurrences/${occurrence.id}/confirm`, { request_id: rid(), version: occurrence.version });
    }
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/closing`, { request_id: rid(), version: (await space(created.id)).version });
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/return-plans`, {
      request_id: rid(), version: (await space(created.id)).version,
      returns: [{ recipient_user_id: state.owner.id, amount_minor: '400' }, { recipient_user_id: state.partner.id, amount_minor: '600' }],
    });
    const plan = (await owner.data('GET', `/api/app/spaces/${created.id}/pooled-funds/workspace`)).return_plan;
    const toPartner = plan.returns.find(item => item.recipient_user_id === state.partner.id);
    await owner.data('POST', `/api/app/spaces/${created.id}/pooled-funds/returns/${toPartner.id}/sent`, { request_id: rid(), version: toPartner.version });
    return { id: created.id };
  });

  if (correctionChest.openedOn < date) {
    await step('shared-corrections:settle-opening-day', async () => {
      const batch = await owner.data('POST', `/api/app/spaces/${correctionChest.id}/shared-settlements`, {
        request_id: rid(), version: (await space(correctionChest.id)).version, period_end: correctionChest.openedOn,
      });
      if (batch.status !== 'COMPLETED') throw new Error(`Expected the balanced opening-day round to complete, got ${batch.status}`);
    });
    await step('shared-corrections:add', async () => {
      const { corrected, voided } = correctionChest.expenses;
      await owner.data('POST', `/api/app/spaces/${correctionChest.id}/shared-corrections/expenses`, {
        request_id: rid(), source_expense_id: corrected, source_revision: 0, occurred_on: date, reason: '收據金額看錯，實際是 800',
        amount_minor: '800', payers: [{ user_id: state.owner.id, amount_minor: '800' }], allocations: [{ user_id: state.owner.id, amount_minor: '800' }],
      });
      await owner.data('POST', `/api/app/spaces/${correctionChest.id}/shared-corrections/expenses`, {
        request_id: rid(), source_expense_id: voided, source_revision: 0, occurred_on: date, reason: '重複記帳，作廢這一筆',
        amount_minor: '0', payers: [], allocations: [],
      });
    });
  }

  console.log('\nDemo accounts (password is in the state file):');
  console.log(`  ${state.owner.email}`);
  console.log(`  ${state.partner.email}`);
  console.log(`State: ${statePath}`);
  if (!state.steps['shared-corrections:add']) {
    console.log(`Corrections: run this command again on a day after ${correctionChest.openedOn} (Asia/Taipei).`);
  }
}

main().catch(error => { console.error(error.message ?? error); process.exit(1); });

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (...path: string[]) => join(__dirname, '..', ...path);

describe('Sentry backend wiring', () => {
  it('initializes the privacy-filtered SDK before Nest and registers the global filter', () => {
    const instrument = source('instrument.ts');
    const main = source('main.ts');
    const appModule = source('app.module.ts');

    expect(existsSync(instrument)).toBe(true);
    expect(readFileSync(main, 'utf8').trimStart().startsWith("import './instrument';")).toBe(true);

    const instrumentSource = readFileSync(instrument, 'utf8');
    expect(instrumentSource).toContain('MIMIC_SENTRY_DSN');
    expect(instrumentSource).toContain('sendDefaultPii: false');
    expect(instrumentSource).toContain('createSentryEventHooks');
    expect(instrumentSource).toContain('beforeSend: eventHooks.beforeSend');
    expect(instrumentSource).toContain('beforeSendTransaction: eventHooks.beforeSendTransaction');
    expect(instrumentSource).toContain('tracesSampleRate: 0');
    expect(instrumentSource).toContain('includeLocalVariables: false');
    expect(instrumentSource).not.toContain('replayIntegration');

    const appModuleSource = readFileSync(appModule, 'utf8');
    expect(appModuleSource).toContain('SentryModule.forRoot()');
    expect(appModuleSource).toContain('SentryGlobalFilter');
    expect(appModuleSource).toContain('APP_FILTER');
  });
});

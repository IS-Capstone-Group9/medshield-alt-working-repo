import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import express from 'express';
import { createIntakeService, intakeConfig, IntakeError, INTAKE_COLUMNS, INTAKE_LIMIT, parseIntakeCsv } from '../src/salesIngestion';
import { salesIngestionRouter } from '../src/salesIngestionRoutes';
const hash = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const csv = Buffer.from(INTAKE_COLUMNS.join(',') + '\r\nr1,2026-10-01,DR1,Drug,Quezon,1,10.00,2.00\r\n');
const actor = { account_id: 1, role: 'analyst' };
const config = { host: 'https://warehouse.invalid', token: 'secret-fixture-only', volume: '/Volumes/workspace/medshield_intake/raw', jobId: 7 };
const code = (expected: string) => (e: unknown) => e instanceof IntakeError && e.code === expected && !e.message.includes(config.token);
function fixture(clientExports = false) {
    const files = new Map<string, Buffer>();
    const calls: {
        path: string;
        body?: any;
    }[] = [];
    let fail = false;
    let run: any = { run_id: 23 };
    let override: ((url: URL) => Response | undefined) | undefined;
    const request = (async (input: any, init: RequestInit = {}) => {
        const url = new URL(String(input));
        calls.push({ path: url.pathname, body: init.body });
        assert.equal((init.headers as any).Authorization, 'Bearer ' + config.token);
        assert.equal(init.redirect, 'error');
        const special = override?.(url);
        if (special)
            return special;
        if (url.pathname.includes('/directories'))
            return new Response(null);
        if (url.pathname.includes('/files')) {
            const path = decodeURIComponent(url.pathname.slice('/api/2.0/fs/files'.length));
            if (init.method === 'PUT') {
                if (files.has(path))
                    return new Response(null, { status: 409 });
                files.set(path, Buffer.from(init.body as Uint8Array));
                return new Response(null);
            }
            return files.has(path) ? new Response(new Uint8Array(files.get(path)!)) : new Response(null, { status: 404 });
        }
        if (url.pathname.endsWith('/run-now')) {
            if (fail) {
                fail = false;
                throw Error(config.token);
            }
            return Response.json(run);
        }
        return Response.json({ job_id: 7, run_id: 23, state: { life_cycle_state: 'RUNNING' }, secret: config.token });
    }) as typeof fetch;
    const service = createIntakeService({ ...config, clientExports }, request);
    const base = (id: string) => config.volume + '/submissions/' + id;
    function report(id: string, mutate: (r: any) => void = () => { }) { const bytes = Buffer.from('row_number,source_record_id,issue\r\n'); const value = { schema_version: 1, ingestion_id: id, source_sha256: hash(csv), policy_version: 'client_sales_csv_v1', category_reference_sha256: 'a'.repeat(64), candidate_only: true, published: false, status: 'READY_FOR_APPROVAL', counts: { received: 1, accepted: 1, rejected: 0, category_review: 0 }, net_sales_candidate: '10.00', reports: { issues: { sha256: hash(bytes), bytes: bytes.length }, classifications: { sha256: hash(bytes), bytes: bytes.length } }, message: config.token, secret: config.token }; mutate(value); files.set(base(id) + '/report.json', Buffer.from(JSON.stringify(value))); files.set(base(id) + '/issues.csv', bytes); files.set(base(id) + '/classifications.csv', bytes); }
    return { files, calls, service, base, report, fail: () => { fail = true; }, run: (x: any) => { run = x; }, override: (x: typeof override) => { override = x; } };
}
test('CSV preserves UTF8 BOM, quoted commas/quotes and multiline fields', () => { assert.equal(parseIntakeCsv(csv).length, 2); const text = '\uFEFF' + INTAKE_COLUMNS.join(',') + '\r\nr1,2026-10-01,DR1,"Drug, ""A""\r\n₱",Quezon,1,10,2\r\n'; assert.equal(parseIntakeCsv(Buffer.from(text))[1][3], 'Drug, "A"\r\n₱'); });

test('staged client export binds physical line count and reconciles non-transaction evidence', async () => {
    const source = Buffer.from('Area,DR Number,Date Delivered,Product,Qty,CP,Total CP,Disc,Net CP,TP Unit,Total TP,Net Income\r\nBicol,DR-1,10/01/2026,Medicine,1,10,10,0,10,8,8,2\r\n');
    await assert.rejects(fixture().service.submit(source, 'client.csv', actor), IntakeError);
    const f = fixture(true);
    await assert.rejects(f.service.submit(Buffer.from('unknown,header\nx,y'), 'unknown.csv', actor), IntakeError);
    const { ingestion_id: id } = await f.service.submit(source, 'client.csv', actor);
    const manifest = JSON.parse(f.files.get(f.base(id) + '/manifest.json')!.toString());
    assert.equal(manifest.source_format, 'client_export');
    assert.equal(manifest.record_count, 3);
    assert.deepEqual(f.files.get(f.base(id) + '/source.csv'), source);
    f.report(id, report => {
        report.source_sha256 = hash(source);
        Object.assign(report.counts, { received: 3, non_transaction: 2 });
    });
    const result = await f.service.status(id, actor);
    assert.equal(result.status, 'READY_FOR_APPROVAL');
    assert.deepEqual(result.counts, { received: 3, accepted: 1, rejected: 0, category_review: 0, non_transaction: 2 });
    f.report(id, report => {
        report.source_sha256 = hash(source);
        Object.assign(report.counts, { received: 3, non_transaction: 1 });
    });
    await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID'));
});

test('staged upload recognizes modern percentage and grouped headers', async () => {
    const modern = 'Area,DR Number,Date Delivered,Product,Qty,CP,Total CP,Disc,Net CP,TP Unit,Total TP,Net Income,%';
    const grouped = 'MO,DATE,AREA,DR NUMBER,DATE DELIVERED,DOCTOR,PRODUCT,GROSS SALES,,,NET SALES,,,COST OF SALES,,,GROSS INCOME';
    const subheader = ',,,,,,,QUANTITY,CP UNIT,TOTAL SALES,% DISCOUNT,DISCOUNT,NET SALES,QUANTITY,TP UNIT,TOTAL COST,';
    const cases = [
        { text: modern + '\nr,1,2026-10-01,p,1,10,10,0,10,8,8,2,20%', lines: 2 },
        { text: grouped + '\n' + subheader + '\n1,2,a,3,2026-10-01,d,"medicine\nlabel",1,10,10,0,0,10,1,8,8,2\n', lines: 5 },
    ];
    const f = fixture(true);
    for (const { text, lines } of cases) {
        const { ingestion_id: id } = await f.service.submit(Buffer.from(text), 'client.csv', actor);
        assert.equal(JSON.parse(f.files.get(f.base(id) + '/manifest.json')!.toString()).record_count, lines);
    }
    await assert.rejects(f.service.submit(Buffer.from(grouped + '\nmissing subheader\n1,2'), 'client.csv', actor), IntakeError);
});
for (const [label, value] of Object.entries({ empty: Buffer.alloc(0), size: Buffer.alloc(INTAKE_LIMIT + 1), utf8: Buffer.from([0xc0, 0xaf]), binary: Buffer.from('x\0'), header: Buffer.from('wrong\n1'), headerOnly: Buffer.from(INTAKE_COLUMNS.join(',')), unclosed: Buffer.from(csv.toString().replace('Drug', '"Drug')), strayQuote: Buffer.from(csv.toString().replace('Drug', 'Dr"ug')), afterQuote: Buffer.from(csv.toString().replace('Drug', '"Drug"x')), columns: Buffer.from(csv.toString().replace('Drug', 'Drug,x')), blank: Buffer.from(csv.toString() + '\n'), field: Buffer.from(csv.toString().replace('Drug', 'x'.repeat(10001))) }))
    test('CSV rejects ' + label, () => assert.throws(() => parseIntakeCsv(value), IntakeError));
test('renamed retry keeps immutable bytes and idempotency token with no publication', async () => { const f = fixture(); const first = await f.service.submit(csv, 'one.csv', actor); assert.deepEqual(await f.service.submit(csv, 'two.csv', actor), first); assert.equal(f.files.size, 3); for (const c of f.calls.filter(c => c.path.endsWith('/run-now')))
    assert.equal(JSON.parse(c.body).idempotency_token, first.ingestion_id); assert.equal((await f.service.status(first.ingestion_id, actor)).status, 'PROCESSING'); assert.ok(f.calls.every(c => !/sql|publish|serving/i.test(c.path))); });
test('interrupted provider submission reports incomplete and identical retry resumes', async () => { const f = fixture(); f.fail(); await assert.rejects(f.service.submit(csv, 'one.csv', actor), code('INGESTION_PROVIDER_UNAVAILABLE')); const id = hash('client_sales_csv_v1:1:' + hash(csv)); assert.equal((await f.service.status(id, actor)).status, 'SUBMISSION_INCOMPLETE'); assert.equal((await f.service.submit(csv, 'two.csv', actor)).ingestion_id, id); });
test('existing source conflict blocks job', async () => { const f = fixture(); const id = hash('client_sales_csv_v1:1:' + hash(csv)); f.files.set(f.base(id) + '/source.csv', Buffer.alloc(csv.length, 65)); await assert.rejects(f.service.submit(csv, 'one.csv', actor), code('INGESTION_IDENTITY_CONFLICT')); assert.ok(!f.calls.some(c => c.path.endsWith('/run-now'))); });
test('ownership denied, Admin read allowed, actor/ID/filename validation', async () => { const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor); await assert.rejects(f.service.status(id, { account_id: 2, role: 'analyst' }), code('INGESTION_NOT_FOUND')); assert.equal((await f.service.status(id, { account_id: 2, role: 'Admin' })).status, 'PROCESSING'); await assert.rejects(f.service.status('../x', actor), code('INVALID_SALES_INTAKE')); await assert.rejects(f.service.submit(csv, '../x.csv', actor), code('INVALID_SALES_INTAKE')); await assert.rejects(f.service.submit(csv, 'x.csv', { account_id: 0, role: 'admin' }), code('INGESTION_FORBIDDEN')); });
test('report allowlist removes remote secrets and report downloads require digest', async () => { const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor); f.report(id); const value = await f.service.status(id, actor); assert.equal(value.status, 'READY_FOR_APPROVAL'); assert.ok(!JSON.stringify(value).includes(config.token)); assert.ok((await f.service.report(id, actor, 'issues')).length); f.files.set(f.base(id) + '/issues.csv', Buffer.from('wrong')); await assert.rejects(f.service.report(id, actor, 'issues'), code('INGESTION_REPORT_INVALID')); });
const invalidReports: Record<string, (r: any) => void> = { source: r => { r.source_sha256 = 'b'.repeat(64); }, policy: r => { r.policy_version = 'wrong'; }, publication: r => { r.published = true; }, status: r => { r.status = 'PUBLISHED'; }, counts: r => { r.counts.accepted = 2; }, category: r => { r.counts.category_review = 1; }, hash: r => { r.reports.issues.sha256 = 'bad'; }, size: r => { r.reports.issues.bytes = 100000000; }, null: r => { r.counts = null; } };
for (const [label, mutate] of Object.entries(invalidReports))
    test('report rejects ' + label, async () => { const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor); f.report(id, mutate); await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID')); await assert.rejects(f.service.report(id, actor, 'issues'), code('INGESTION_REPORT_INVALID')); });
test('unbound report cannot download before manifest', async () => { const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor); f.files.set(f.base(id) + '/issues.csv', Buffer.from('x')); await assert.rejects(f.service.report(id, actor, 'issues'), code('INGESTION_REPORT_NOT_READY')); });
for (const body of [null, [], config.token, { run_id: -1 }, { run_id: 0 }, { run_id: 1.5 }])
    test('invalid provider run ' + JSON.stringify(body), async () => { const f = fixture(); f.run(body); await assert.rejects(f.service.submit(csv, 'one.csv', actor), (e: any) => e instanceof IntakeError && !e.message.includes(config.token)); });
test('malformed JSON, oversized body, stream interruption and denial are sanitized', async () => { for (const response of [new Response('{secret'), new Response(new Uint8Array(1024 * 1024 + 1)), new Response(new ReadableStream({ start(c) { c.error(Error(config.token)); } })), new Response(config.token, { status: 403 })]) {
    const f = fixture();
    f.override(url => url.pathname.endsWith('/run-now') ? response : undefined);
    await assert.rejects(f.service.submit(csv, 'one.csv', actor), (e: any) => e instanceof IntakeError && !e.message.includes(config.token));
} });
test('configuration validates job, volume, host and disabled switch', () => { const values = { DATABRICKS_INGESTION_ENABLED: 'true', DATABRICKS_HOST: config.host, DATABRICKS_INGESTION_TOKEN: config.token, DATABRICKS_INGESTION_VOLUME: config.volume, DATABRICKS_INGESTION_JOB_ID: '7' }; const before = { ...process.env }; try {
    Object.assign(process.env, values);
    assert.deepEqual(intakeConfig(), config);
    for (const [key, value] of [['DATABRICKS_HOST', 'https://user:password@host.invalid'], ['DATABRICKS_INGESTION_VOLUME', '/Volumes/x/y/../z'], ['DATABRICKS_INGESTION_JOB_ID', '-1'], ['DATABRICKS_INGESTION_ENABLED', 'false']]) {
        const old = process.env[key];
        process.env[key] = value;
        assert.throws(intakeConfig, code('INGESTION_NOT_CONFIGURED'));
        process.env[key] = old;
    }
}
finally {
    for (const key of Object.keys(values)) {
        if (before[key] === undefined)
            delete process.env[key];
        else
            process.env[key] = before[key];
    }
} });
test('HTTP auth/role/audit failures and raw body errors fail closed', async (t) => { const before = { ...process.env }; const actualFetch = global.fetch; let remote = 0; let audits = 0; Object.assign(process.env, { DATABRICKS_INGESTION_ENABLED: 'true', DATABRICKS_HOST: config.host, DATABRICKS_INGESTION_TOKEN: config.token, DATABRICKS_INGESTION_VOLUME: config.volume, DATABRICKS_INGESTION_JOB_ID: '7' }); global.fetch = (async () => { remote++; throw Error(config.token); }) as typeof fetch; const app = express(); app.use('/intake', salesIngestionRouter((req: any, res, next) => { if (!req.headers.authorization) {
    res.sendStatus(401);
    return;
} req.user = { account_id: 1, role: req.headers.authorization }; next(); }, (req: any, res, next) => { if (req.user.role === 'viewer') {
    res.sendStatus(403);
    return;
} next(); }, async () => { audits++; throw Error(config.token); })); const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve)); const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = 'http://127.0.0.1:' + address.port + '/intake'; t.after(async () => { global.fetch = actualFetch; for (const key of ['DATABRICKS_INGESTION_ENABLED', 'DATABRICKS_HOST', 'DATABRICKS_INGESTION_TOKEN', 'DATABRICKS_INGESTION_VOLUME', 'DATABRICKS_INGESTION_JOB_ID']) {
    if (before[key] === undefined)
        delete process.env[key];
    else
        process.env[key] = before[key];
} await new Promise<void>(resolve => server.close(() => resolve())); }); const req = (p: string, i: RequestInit = {}) => actualFetch(base + p, i); const headers = { Authorization: 'analyst', 'Content-Type': 'text/csv' }; assert.equal((await req('/configuration')).status, 401); assert.equal((await req('/configuration', { headers: { Authorization: 'viewer' } })).status, 403); assert.equal((await (await req('/configuration', { headers })).json()).enabled, true); assert.equal((await (await req('/template', { headers })).text()).trim(), INTAKE_COLUMNS.join(',')); const failure = await req('/?filename=x.csv', { method: 'POST', headers, body: new Uint8Array(csv) }); assert.equal(failure.status, 502); assert.ok(!(await failure.text()).includes(config.token)); assert.equal(audits, 1); assert.equal(remote, 0); assert.equal((await req('/?filename=x.csv', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' })).status, 415); assert.equal((await req('/?filename=x.csv', { method: 'POST', headers, body: new Uint8Array(INTAKE_LIMIT + 1) })).status, 413); process.env.DATABRICKS_INGESTION_ENABLED = 'false'; assert.equal((await req('/configuration', { headers })).status, 503); });
test('record-count ceiling accepts 100000 and rejects 100001', () => { const header = INTAKE_COLUMNS.join(',') + '\n'; const row = 'r,2026-10-01,d,p,a,1,1,1\n'; assert.equal(parseIntakeCsv(Buffer.from(header + row.repeat(100000))).length, 100001); assert.throws(() => parseIntakeCsv(Buffer.from(header + row.repeat(100001))), IntakeError); });
test('manifest identity, malformed JSON, missing objects and run identity fail closed', async () => {
    const f = fixture();
    const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor);
    const path = f.base(id) + '/manifest.json';
    const original = f.files.get(path)!;
    f.files.set(path, Buffer.from('{secret'));
    await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID'));
    const changed = JSON.parse(original.toString());
    changed.source_sha256 = 'c'.repeat(64);
    f.files.set(path, Buffer.from(JSON.stringify(changed)));
    await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID'));
    f.files.set(path, original);
    f.override(url => url.pathname.endsWith('/runs/get') ? Response.json({ job_id: 99, run_id: 23 }) : undefined);
    await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID'));
    f.override(undefined);
    f.report(id);
    f.files.delete(f.base(id) + '/issues.csv');
    await assert.rejects(f.service.report(id, actor, 'issues'), code('INGESTION_REPORT_NOT_READY'));
    f.files.set(f.base(id) + '/report.json', Buffer.from('null'));
    await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID'));
});
test('provider advertised oversize rejected without returning its contents', async () => { const f = fixture(); f.override(url => url.pathname.endsWith('/run-now') ? new Response(config.token, { headers: { 'Content-Length': '100000000' } }) : undefined); await assert.rejects(f.service.submit(csv, 'one.csv', actor), code('INGESTION_REPORT_INVALID')); });

// ---- per-stage evidence (Databricks Job receipts) ----
const stageReceipt = (id: string, stage: string, previous: string | null, extra: Record<string, unknown> = {}) => Buffer.from(JSON.stringify({ schema_version: 1, stage, state: 'SUCCEEDED', ingestion_id: id, source_sha256: hash(csv), candidate_only: true, published: false, previous_receipt_sha256: previous, counts: { records: 1, received: 1, accepted: 1, rejected: 0, ignored: 99 }, ...extra }));
function writeStages(f: ReturnType<typeof fixture>, id: string, names: string[], mutate: (stage: string, value: Buffer) => Buffer = (_s, v) => v) {
    let previous: string | null = null;
    for (const name of names) { const bytes = stageReceipt(id, name, previous); f.files.set(f.base(id) + '/stages/stage_' + name + '.json', mutate(name, bytes)); previous = hash(bytes); }
}
test('status reports only evidence-backed stages with allowlisted counts', async () => {
    const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor);
    const before: any = await f.service.status(id, actor);
    assert.deepEqual(before.stages.map((s: any) => s.state), ['NO_EVIDENCE_YET', 'NO_EVIDENCE_YET', 'NO_EVIDENCE_YET']);
    writeStages(f, id, ['bronze', 'silver']);
    const value: any = await f.service.status(id, actor);
    assert.equal(value.status, 'PROCESSING');
    assert.deepEqual(value.stages.map((s: any) => [s.name, s.state]), [['bronze', 'SUCCEEDED'], ['silver', 'SUCCEEDED'], ['gold', 'NO_EVIDENCE_YET']]);
    assert.deepEqual(value.stages[0].counts, { records: 1, received: 1, accepted: 1, rejected: 0 });
    assert.ok(!JSON.stringify(value).includes(config.token));
});
test('verified report status also carries all three stage receipts', async () => {
    const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor);
    writeStages(f, id, ['bronze', 'silver', 'gold']); f.report(id);
    const value: any = await f.service.status(id, actor);
    assert.equal(value.status, 'READY_FOR_APPROVAL'); assert.equal(value.published, false);
    assert.deepEqual(value.stages.map((s: any) => s.state), ['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED']);
});
type Fx = ReturnType<typeof fixture>;
const swap = (from: string, to: string) => (_s: string, v: Buffer) => Buffer.from(v.toString().replace(from, to));
for (const [label, setup] of Object.entries({
    'a later stage without its predecessor': (f: Fx, id: string) => writeStages(f, id, ['gold']),
    'a broken hash chain': (f: Fx, id: string) => { writeStages(f, id, ['bronze']); f.files.set(f.base(id) + '/stages/stage_silver.json', stageReceipt(id, 'silver', 'f'.repeat(64))); },
    'a receipt for another source': (f: Fx, id: string) => writeStages(f, id, ['bronze'], swap(hash(csv), 'e'.repeat(64))),
    'a published stage': (f: Fx, id: string) => writeStages(f, id, ['bronze'], swap('"published":false', '"published":true')),
    'a failed stage state': (f: Fx, id: string) => writeStages(f, id, ['bronze'], swap('SUCCEEDED', 'FAILED')),
    'negative counts': (f: Fx, id: string) => writeStages(f, id, ['bronze'], swap('"records":1', '"records":-1')),
    'a receipt named for another stage': (f: Fx, id: string) => f.files.set(f.base(id) + '/stages/stage_bronze.json', stageReceipt(id, 'silver', null)),
    'malformed JSON': (f: Fx, id: string) => f.files.set(f.base(id) + '/stages/stage_bronze.json', Buffer.from('{')),
})) {
    test('stage evidence rejects ' + label, async () => {
        const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor); setup(f, id);
        await assert.rejects(f.service.status(id, actor), code('INGESTION_REPORT_INVALID'));
    });
}
test('terminated-successful run without a verified report is reported as missing evidence', async () => {
    const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor);
    f.override(url => url.pathname.endsWith('/runs/get') ? Response.json({ job_id: 7, run_id: 23, state: { life_cycle_state: 'TERMINATED', result_state: 'SUCCESS' } }) : undefined);
    const value: any = await f.service.status(id, actor);
    assert.equal(value.status, 'FAILED'); assert.equal(value.evidence_missing, true); assert.equal(value.published, false);
    f.override(url => url.pathname.endsWith('/runs/get') ? Response.json({ job_id: 7, run_id: 23, state: { life_cycle_state: 'TERMINATED', result_state: 'FAILED' } }) : undefined);
    const failed: any = await f.service.status(id, actor);
    assert.equal(failed.status, 'FAILED'); assert.equal(failed.evidence_missing, undefined);
});
test('a report that appears during a status read still shows its final stage', async () => {
    const f = fixture(); const { ingestion_id: id } = await f.service.submit(csv, 'one.csv', actor);
    writeStages(f, id, ['bronze', 'silver', 'gold']); const gold = f.base(id) + '/stages/stage_gold.json'; const saved = f.files.get(gold)!; f.files.delete(gold); f.report(id);
    f.override(url => { if (url.pathname.endsWith('report.json')) f.files.set(gold, saved); return undefined; });
    const value: any = await f.service.status(id, actor);
    assert.deepEqual(value.stages.map((s: any) => s.state), ['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED']);
});

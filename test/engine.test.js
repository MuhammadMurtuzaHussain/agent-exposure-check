import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUESTIONS, SEVERITY, TRIFECTA, FRAMEWORK_LABELS } from '../src/questions.js';
import { evaluate, toMarkdown, isApplicable, riskFactor } from '../src/engine.js';

const allSafe = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, q.kind === 'exposure' ? 'no' : 'yes']));
const allRisky = () => Object.fromEntries(QUESTIONS.map((q) => [q.id, q.kind === 'exposure' ? 'yes' : 'no']));

test('question bank is well formed', () => {
  const ids = new Set();
  for (const q of QUESTIONS) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
    ids.add(q.id);
    assert.ok(SEVERITY[q.severity], `${q.id} has a known severity`);
    assert.ok(['exposure', 'control'].includes(q.kind), `${q.id} has a known kind`);
    for (const field of ['text', 'finding', 'why', 'fix']) assert.ok(q[field]?.length > 10, `${q.id}.${field}`);
    for (const k of Object.keys(q.maps)) assert.ok(FRAMEWORK_LABELS[k], `${q.id} maps to known framework ${k}`);
    if (q.appliesIf) assert.equal(QUESTIONS.find((p) => p.id === q.appliesIf)?.kind, 'exposure', `${q.id} depends on an exposure question`);
  }
  for (const leg of TRIFECTA.legs) assert.ok(ids.has(leg), `trifecta leg ${leg} exists`);
});

test('page copy states the right number of questions', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, new RegExp(`Answer ${QUESTIONS.length} short questions`));
});

test('empty answers give no findings and a provisional state', () => {
  const r = evaluate({});
  assert.equal(r.findings.length, 0);
  assert.equal(r.answered, 0);
  assert.equal(r.complete, false);
});

test('a fully safe agent scores 100 with no findings', () => {
  const r = evaluate(allSafe());
  assert.equal(r.score, 100);
  assert.equal(r.findings.length, 0);
  assert.equal(r.trifecta, false);
  assert.equal(r.band.id, 'low');
});

test('a fully risky agent scores 0, flags every question and the trifecta first', () => {
  const r = evaluate(allRisky());
  assert.equal(r.score, 0);
  assert.equal(r.band.id, 'severe');
  assert.equal(r.trifecta, true);
  assert.equal(r.findings.length, QUESTIONS.length + 1);
  assert.equal(r.findings[0].id, 'lethal_trifecta');
  assert.equal(r.findings[0].severity, 'critical');
});

test('findings are sorted from most to least severe', () => {
  const ranks = evaluate(allRisky()).findings.map((f) => SEVERITY[f.severity].rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a));
});

test('dependent controls drop out when the agent cannot take actions', () => {
  const answers = { ...allRisky(), takes_actions: 'no' };
  assert.equal(isApplicable(QUESTIONS.find((q) => q.id === 'human_approval'), answers), false);
  const r = evaluate(answers);
  assert.ok(!r.findings.some((f) => f.id === 'human_approval' || f.id === 'least_privilege'));
  assert.equal(r.applicable, QUESTIONS.length - 2);
});

test('"partly" counts half and downgrades severity one level', () => {
  const q = QUESTIONS.find((x) => x.id === 'adversarial_testing');
  assert.equal(riskFactor(q, 'partly'), 0.5);
  const r = evaluate({ ...allSafe(), adversarial_testing: 'partly' });
  const f = r.findings.find((x) => x.id === 'adversarial_testing');
  assert.equal(f.severity, 'medium');
  assert.ok(r.score > evaluate({ ...allSafe(), adversarial_testing: 'no' }).score);
});

test('"unknown" is treated as a full gap', () => {
  const r = evaluate({ ...allSafe(), logging: 'unknown' });
  const f = r.findings.find((x) => x.id === 'logging');
  assert.equal(f.severity, 'medium');
  assert.equal(f.answer, 'unknown');
});

test('trifecta needs all three legs', () => {
  const two = evaluate({ ...allSafe(), untrusted_input: 'yes', sensitive_data: 'yes' });
  assert.equal(two.trifecta, false);
  const three = evaluate({ ...allSafe(), untrusted_input: 'yes', sensitive_data: 'yes', exfil_channel: 'yes' });
  assert.equal(three.trifecta, true);
  const uncertain = evaluate({ ...allSafe(), untrusted_input: 'yes', sensitive_data: 'unknown', exfil_channel: 'yes' });
  assert.equal(uncertain.findings.find((f) => f.id === 'lethal_trifecta').severity, 'high');
});

test('markdown report includes score, findings and escapes the agent name', () => {
  const r = evaluate(allRisky());
  const md = toMarkdown(r, { agentName: 'Bot <script>*x*', purpose: 'Test', date: '2026-11-13' });
  assert.match(md, /^# AI Agent Exposure Check: Bot \\<script\\>\\\*x\\\*/);
  assert.match(md, /\*\*Score:\*\* 0\/100 \(Severe exposure\)/);
  assert.match(md, /### 1\. Untrusted input, private data and an outbound channel in one agent \(Critical\)/);
  assert.match(md, /OWASP Top 10 for LLM Applications \(2025\): LLM01 Prompt Injection/);
  assert.match(md, /not a security test/);
});

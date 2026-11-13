// Browser UI. Builds the form from the question bank and re-scores on every change.
// No storage, no network calls: answers exist only in this tab.

import { QUESTIONS, SECTIONS, SEVERITY, FRAMEWORK_LABELS } from './questions.js';
import { evaluate, isApplicable, toMarkdown } from './engine.js';

const ANSWER_LABELS = { yes: 'Yes', partly: 'Partly', no: 'No', unknown: "Don't know" };

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

function buildForm() {
  const root = $('#sections');
  SECTIONS.forEach((section, si) => {
    const fs = el('fieldset', { class: 'section' }, el('legend', { text: `${si + 1}. ${section.title}` }), el('p', { class: 'intro', text: section.intro }));
    QUESTIONS.filter((q) => q.section === section.id).forEach((q) => {
      const group = el('div', { class: 'question', 'data-id': q.id, role: 'radiogroup', 'aria-labelledby': `q-${q.id}` });
      group.append(el('p', { id: `q-${q.id}`, class: 'qtext', text: q.text }));
      const opts = el('div', { class: 'options' });
      Object.entries(ANSWER_LABELS).forEach(([value, label]) => {
        const input = el('input', { type: 'radio', name: q.id, value, id: `${q.id}-${value}` });
        opts.append(el('label', { for: `${q.id}-${value}`, class: `opt opt-${value}` }, input, el('span', { text: label })));
      });
      group.append(opts);
      group.append(el('p', { class: 'na', text: 'Not applicable: depends on an earlier "No".' }));
      fs.append(group);
    });
    root.append(fs);
  });
}

function readAnswers() {
  const answers = {};
  for (const q of QUESTIONS) {
    const checked = document.querySelector(`input[name="${q.id}"]:checked`);
    if (checked) answers[q.id] = checked.value;
  }
  return answers;
}

function renderFinding(f) {
  const li = el('li', { class: `finding sev-${f.severity}` });
  li.append(el('div', { class: 'fhead' }, el('span', { class: 'sev', text: SEVERITY[f.severity].label }), el('strong', { text: f.title })));
  if (f.answer === 'unknown') li.append(el('p', { class: 'unknown', text: 'Answered "don\'t know": treat as a gap until someone checks.' }));
  li.append(el('p', {}, el('b', { text: 'Why it matters: ' }), document.createTextNode(f.why)));
  li.append(el('p', {}, el('b', { text: 'What to do: ' }), document.createTextNode(f.fix)));
  const refs = Object.entries(f.maps).filter(([, v]) => v && v.length);
  if (refs.length) {
    const details = el('details', {}, el('summary', { text: 'Framework references' }));
    const ul = el('ul');
    refs.forEach(([k, v]) => ul.append(el('li', {}, el('b', { text: `${FRAMEWORK_LABELS[k]}: ` }), document.createTextNode(v.join('; ')))));
    details.append(ul);
    li.append(details);
  }
  return li;
}

function update() {
  const answers = readAnswers();

  for (const q of QUESTIONS) {
    const node = document.querySelector(`.question[data-id="${q.id}"]`);
    const applies = isApplicable(q, answers);
    node.classList.toggle('disabled', !applies);
    node.querySelectorAll('input').forEach((i) => { i.disabled = !applies; });
  }

  const result = evaluate(answers);
  const started = result.answered > 0;
  $('#score').textContent = started ? result.score : '–';
  $('#band').textContent = started ? result.band.label + (result.complete ? '' : ' (provisional)') : 'Answer the questions to see your score';
  $('#scoreCard').dataset.band = started ? result.band.id : '';
  $('#meterFill').style.width = started ? `${result.score}%` : '0';
  $('#progress').textContent = `${result.answered} of ${result.applicable} questions answered`;

  const alert = $('#trifectaAlert');
  alert.hidden = !result.trifecta;
  alert.textContent = result.trifecta
    ? 'Warning: this agent combines untrusted input, private data and a way to send data out. Anyone who can put text in front of it may be able to make it leak that data.'
    : '';

  const list = $('#findings');
  list.replaceChildren(...result.findings.map(renderFinding));
  if (!result.findings.length) list.append(el('li', { class: 'empty', text: started ? 'No findings from your answers so far.' : 'Findings will appear here as you answer.' }));

  return result;
}

function download() {
  const result = update();
  const md = toMarkdown(result, { agentName: $('#agentName').value.trim(), purpose: $('#purpose').value.trim() });
  const slug = ($('#agentName').value.trim() || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent';
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  const a = el('a', { href: url, download: `exposure-check-${slug}.md` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

buildForm();
$('#check').addEventListener('change', update);
$('#download').addEventListener('click', download);
$('#print').addEventListener('click', () => {
  document.querySelectorAll('#findings details').forEach((d) => { d.open = true; });
  window.print();
});
$('#reset').addEventListener('click', () => { $('#check').reset(); update(); window.scrollTo({ top: 0 }); });
update();

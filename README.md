# AI Agent Exposure Check

**Try it: [muhammadmurtuzahussain.github.io/agent-exposure-check](https://muhammadmurtuzahussain.github.io/agent-exposure-check/)**

A free, open-source self-assessment that shows how exposed an AI agent, copilot or chatbot is to **prompt injection, data leakage and tool misuse**, and where each weakness maps in the frameworks organisations are already working towards:

- **OWASP Top 10 for LLM Applications (2025)**
- **ISO/IEC 42001** (AI management system), Annex A
- **ISO/IEC 27001:2022**, Annex A
- **NIS2 Directive**, Articles 20, 21 and 23
- **EU AI Act**, including Article 4 (AI literacy) and Article 50 (transparency)

It runs entirely in the browser. There is no backend, no analytics and no storage, and a Content Security Policy blocks all network requests from the page. Answers never leave the tab.

## Who it is for

- **Small and mid-sized organisations** rolling out AI assistants that want a quick, honest view of their exposure before they go live.
- **Security, GRC and privacy consultants** who need a structured first conversation with a client about an AI deployment: a discovery checklist that already speaks the language of ISO 42001, ISO 27001 and NIS2.
- **Internal audit and risk teams** building an AI inventory and looking for a consistent way to triage each system.

## How it works

You answer 19 questions about one agent, each with **Yes / Partly / No / Don't know**:

1. **What the agent can see and do** (its attack surface): untrusted input, tool use, sensitive data, outbound channels, memory, shared retrieval and third-party components.
2. **Safeguards in place**: human approval, least privilege, prompt hygiene, output handling, component inventory, logging, usage limits, adversarial testing, ownership and impact assessment, incident response, transparency and staff training.

Each risky answer becomes a finding with a severity, a plain-English explanation, a recommended fix and framework references. Questions that depend on an earlier answer drop out when they don't apply (for example, approval controls when the agent cannot take actions).

### Scoring

| Answer | Effect |
|---|---|
| Risky answer ("Yes" to an exposure, "No" to a safeguard) | Full weight of the question's severity |
| Partly | Half weight, severity one level lower |
| Don't know | Full weight: an unverified control is a gap until someone checks it |

Severity weights are Critical 10, High 6, Medium 3, Low 1. The score is the share of applicable weight *not* lost, from 0 to 100:

| Score | Band |
|---|---|
| 80–100 | Low exposure |
| 60–79 | Moderate exposure |
| 40–59 | High exposure |
| 0–39 | Severe exposure |

### The combination check

An agent that **reads untrusted content**, **can reach private data** and **has a way to send data out** can be instructed, by anyone who can put text in front of it, to collect that data and leak it. The tool raises this as a separate critical finding, because no single control reliably fixes it: the dependable fix is to remove one of the three. This framing follows Simon Willison's ["lethal trifecta"](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/).

## Output

- A live score, band and ranked findings beside the questions.
- **Download report (.md)**: a Markdown report you can paste into a ticket, a risk register or a client deliverable.
- **Print / save as PDF**: a printable version with all references expanded.

## Run it

It is a static site with no build step. Because it uses ES modules, serve it over HTTP rather than opening the file directly:

```bash
git clone https://github.com/MuhammadMurtuzaHussain/agent-exposure-check.git
cd agent-exposure-check
npm start            # python3 -m http.server 8080, then open http://localhost:8080
```

Any static host works, including GitHub Pages.

## Test

```bash
npm test
```

The tests cover the question bank's structure, scoring, dependent questions, "partly" and "don't know" handling, the combination check and Markdown escaping. They use Node's built-in test runner, so there are no dependencies to install.

## Project layout

```
index.html          page shell and Content Security Policy
styles.css          light and dark themes, print styles
src/questions.js    question bank, severities and framework mappings
src/engine.js       pure scoring and report functions (no DOM)
src/app.js          browser UI
test/               node:test suite
```

To adapt it, edit `src/questions.js`: each question carries its own finding, explanation, fix and mappings, and the engine and UI pick changes up automatically.

## Limits

- **It is a self-assessment, not a security test.** It reflects the answers given. Confirming them needs authorised adversarial testing of the actual system.
- **Framework references are a starting point**, showing where a reviewer would look first. They are not a compliance verdict, and article-level obligations (especially under the EU AI Act) depend on the system's risk category and current implementation dates.
- One agent per assessment. Assess multi-agent systems one agent at a time, and treat agents that pass data to each other as untrusted input to each other.

## Related work

- [AgentBreaker](https://github.com/MuhammadMurtuzaHussain/agent-breaker): an offensive playbook for authorised red-team exercises against tool-using, RAG, MCP and memory-backed agents.
- [AgentArmor](https://github.com/MuhammadMurtuzaHussain/agent-armor): a defensive checklist mapping each attack class to a concrete control.

This tool sits in front of both: it helps decide which agents need testing first, and what to ask for.

## Contributing

Issues and pull requests are welcome, especially corrections to framework mappings, new questions with a clear finding and fix, and translations. Please keep the tool dependency-free and fully client-side.

## Licence

[MIT](LICENSE) © 2026 Muhammad Murtuza Hussain

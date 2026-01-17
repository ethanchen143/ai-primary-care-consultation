# 3. Validation Plan

**Systematic approach & framework**
- Verification → validation pipeline: unit tests (agents + routing), integration tests (`/api/chat` + retry/escalate), and end-to-end scenario tests with standardized patients.
- Safety-focused adversarial testing: red-team prompts, prompt-injection, edge cases (pediatrics, pregnancy, drug interactions), and multilingual stress tests.
- Offline clinical evaluation: compare outputs to clinician gold labels across curated datasets and guideline checklists.
- Prospective evaluation: silent-mode deployment (no patient-facing output), then stepped-wedge or multi-site RCT with clinician oversight.

**Safety & effectiveness measures**
- Safety: sensitivity for red-flag detection, false-negative rate on emergencies, hallucination rate, guideline adherence, escalation appropriateness.
- Effectiveness: triage accuracy, plan concordance with clinicians, patient comprehension scores, follow-up adherence, time-to-care reduction.

**What convinces hospital admins**
- Predefined go/no-go metrics met across multi-site trials with statistical significance.
- Independent clinical safety audit, clear risk register, and continuous monitoring/rollback plan.
- Evidence of secure operations (audit logs, PHI handling, access controls) and documented human-in-the-loop escalation.

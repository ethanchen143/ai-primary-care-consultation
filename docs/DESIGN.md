# System Design Document: AI Primary Care Consultation

## Overview

A two-phase AI consultation system using a multi-agent architecture:
- **Phase 1**: Doctor gathers info → Supervisor acts as traffic light (approve/reject)
- **Phase 2**: Counselor explains assessment and plan

---

## Architecture

```
                            PHASE 1: Information Gathering
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Patient                                                                   │
│      │                                                                      │
│      ▼                                                                      │
│   ┌──────────────┐         ┌─────────────────┐                              │
│   │    Doctor    │────────▶│   Supervisor    │                              │
│   │    Agent     │         │  (traffic light)│                              │
│   └──────────────┘         └────────┬────────┘                              │
│         ▲                           │                                       │
│         │                     ┌─────┴─────┐                                 │
│         │                     ▼           ▼                                 │
│         │                   [🟢]        [🔴]                                │
│         │                 approved     rejected                             │
│         │                     │           │                                 │
│         │                     │           └──────────▶ retry (max 3x)       │
│         │                     │                              │              │
│         └────────────────────────────────────────────────────┘              │
│                               │                                             │
│                               ▼                                             │
│                      Doctor's Decision                                      │
│                    ┌─────────┬─────────┐                                    │
│                    ▼         ▼         ▼                                    │
│                 [probe]   [ready]  [emergency]                              │
│                    │         │         │                                    │
│                    │         │         └──────▶ escalate() → END            │
│                    │         │                                              │
│                    │         └──────────────────▶ PHASE 2                   │
│                    │                                                        │
│                    └──────────▶ ask more questions                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


                            PHASE 2: Assessment & Plan
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Patient                                                                   │
│      │                                                                      │
│      ▼                                                                      │
│   ┌──────────────┐                                                          │
│   │  Counselor   │──────▶ Explain assessment                                │
│   │    Agent     │──────▶ Walk through plan                                 │
│   └──────────────┘──────▶ Answer follow-up questions                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Supervisor as Traffic Light

The Supervisor does NOT generate content. It only gives:
- **🟢 Green** (`approved: true`) → Doctor's response goes to patient
- **🔴 Red** (`approved: false`) → Doctor regenerates response

```
Doctor generates response
         │
         ▼
    ┌─────────┐
    │Supervisor│
    └────┬────┘
         │
    ┌────┴────┐
    ▼         ▼
  [🟢]      [🔴]
   │         │
   │         └──▶ Doctor tries again (up to 3x)
   │                    │
   │                    └──▶ After 3 failures: escalate()
   ▼
Send to patient
```

---

## Retry Logic (in `/api/chat`)

```typescript
let approved = false;
let attempts = 0;

while (!approved && attempts < 3) {
  attempts++;
  
  // Doctor generates response
  doctorDecision = await runDoctor(conversation, collectedInfo);
  
  // Supervisor checks it (traffic light)
  supervisorResult = await runSupervisor(doctorDecision.response, doctorDecision.type);
  
  approved = supervisorResult.approved;  // 🟢 or 🔴
  
  if (!approved) {
    console.log(`🔴 Rejected (attempt ${attempts}): ${supervisorResult.reason}`);
    // Loop continues, Doctor will try again
  }
}

if (!approved) {
  // 3 strikes, escalate to human
  await escalate("Supervisor rejected 3 times");
}
```

---

## Agent Responsibilities

| Agent | What it does | Output |
|-------|--------------|--------|
| **Doctor** | Talks to patient, gathers symptoms, decides next step | `{type, response, assessment?, plan?}` |
| **Supervisor** | Reviews Doctor's response, approve or reject | `{approved: true/false, reason?}` |
| **Counselor** | Explains assessment to patient in Phase 2 | Plain text response |

---

## Doctor Decision Types

| Type | Meaning | What happens |
|------|---------|--------------|
| `probe` | Need more info | Ask another question, stay in Phase 1 |
| `ready` | Have enough info | Provide assessment, move to Phase 2 |
| `emergency` | Urgent symptoms detected | Call `escalate()`, end conversation |

---

## File Structure

```
src/
├── lib/
│   ├── types.ts          # Phase, ChatState, DoctorDecision, SupervisorResult
│   └── agents.ts         # runDoctor(), runSupervisor(), runCounselor(), escalate()
├── components/
│   ├── PhaseIndicator.tsx    # Shows Phase 1 vs Phase 2 visually
│   ├── ChatMessage.tsx       # Shows "Dr. Amigo" or "Counselor" label
│   └── ChatInput.tsx
└── app/
    ├── api/chat/route.ts     # Main logic: doctor → supervisor → response
    └── page.tsx
```

---

## Visual Phase Indicator (UI)

```
Phase 1 active:
┌────────────────────────────────────────────────────┐
│  [📋 Information Gathering]────[💊 Assessment]     │
│    ▲▲▲ highlighted                                 │
└────────────────────────────────────────────────────┘

Phase 2 active:
┌────────────────────────────────────────────────────┐
│  [✓ Information Gathering]────[💊 Assessment]      │
│                                  ▲▲▲ highlighted   │
└────────────────────────────────────────────────────┘
```

---

## Escalation Triggers

| Trigger | When |
|---------|------|
| Emergency symptoms | Doctor returns `type: "emergency"` |
| 3 supervisor rejections | Quality gate failed |
| System error | Catch block in API |

**Stub (replace in production):**
```typescript
export async function escalate(reason: string): Promise<void> {
  console.log(`[ESCALATION] ${reason}`);
  // POST to external service here
}
```


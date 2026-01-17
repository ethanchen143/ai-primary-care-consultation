# Amigo - AI Primary Care Assistant

A simplified two-phase AI consultation system with multi-agent architecture.

## Architecture

```
Phase 1: Information Gathering
┌──────────┐     ┌────────────┐
│  Doctor  │────▶│ Supervisor │──▶ Response (or retry 3x)
│  Agent   │     │   Agent    │
└──────────┘     └────────────┘
      │
      ├─ probe: ask more questions
      ├─ ready: move to Phase 2
      └─ emergency: escalate to human

Phase 2: Assessment & Plan
┌────────────┐
│ Counselor  │──▶ Explain assessment, answer questions
│   Agent    │
└────────────┘
```

## Quick Start

```bash
npm install

# Add your API key
echo "OPENAI_API_KEY=sk-your-key" > .env.local

npm run dev
# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/
│   ├── api/chat/route.ts    # API with phase logic
│   ├── page.tsx             # Chat UI
│   └── globals.css
├── components/
│   ├── ChatMessage.tsx      # Message bubbles
│   ├── ChatInput.tsx        # Input field
│   └── PhaseIndicator.tsx   # Visual phase display
└── lib/
    ├── types.ts             # Types
    └── agents.ts            # Doctor, Supervisor, Counselor
```

## Key Features

- **Two-Phase Flow**: Clear visual indication of consultation phase
- **Multi-Agent**: Doctor collects info, Supervisor validates, Counselor explains
- **Auto-Retry**: Supervisor rejects bad responses, Doctor retries (max 3x)
- **Emergency Escalation**: Immediate handoff to human for urgent symptoms

## Agents

| Agent | Role |
|-------|------|
| Doctor | Gathers symptoms, decides when ready for assessment |
| Supervisor | Validates Doctor's response quality |
| Counselor | Explains assessment and treatment plan |

## Documentation

- [System Design](docs/DESIGN.md)
- [System Prompt](docs/SYSTEM_PROMPT.md)
- [Sample Transcripts](docs/TRANSCRIPTS.md)
- [Validation Plan](docs/VALIDATION_PLAN.md)

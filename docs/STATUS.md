# Project status

CarMind is a working prototype. The core conversational loop, the two domain models, and the search tools are implemented; some pieces are built but not yet wired in, and there are a couple of known build blockers.

## Working

- **Tool-calling chat loop** — `app/api/chat/route.ts` streams Claude responses via the Vercel AI SDK and runs the four registered tools.
- **Budget model** (`lib/models/budget.ts`) — UK income-tax + NI take-home calculation, emergency-fund sizing, affordability and max-purchase-price logic.
- **Insurance model** (`lib/models/insurance.ts`) — age / group / location / NCB / mileage multipliers over a base premium, with an insurance-group lookup table for ~30 enthusiast cars.
- **Exa search tools** (`lib/utils/exa.ts`) — UK price search and owner-experience search, wired into the agent.
- **Session persistence** (`lib/db/supabase.ts`, `app/api/session`) — Postgres-backed sessions and message history.
- **Research + export routes** — `app/api/research/[carId]` composes a running-cost breakdown; `app/api/export/[sessionId]/budget-plan` returns plan JSON.

## Built but not wired in

- **DVLA client** (`lib/utils/dvla.ts`) — `lookupVehicle` / `estimateTaxFromVehicleData` are implemented and imported into `ai-tools.ts`, but no DVLA tool is exposed to the agent yet.
- **`generateBudgetPlan`** (`lib/models/budget.ts`) — month-by-month plan generator exists and is referenced in the system prompt, but isn't registered as a tool.
- **`searchInsuranceGroup` / `searchVehicleTax`** (`lib/utils/exa.ts`) and **`calculateWhatIfScenarios`** (`budget.ts`) — implemented, not yet called.
- The `research` route still has placeholder values for tax / maintenance / tyres and a "pending" ownership-synthesis step.

## Known issues

- `next build` currently fails on two type errors in `app/api/chat/route.ts`:
  - `maxSteps` is not a valid `streamText` option in the installed AI SDK version (replace with the v6 step-control API, e.g. `stopWhen: stepCountIs(5)`).
  - `updateSession({ updated_at: ... })` uses a snake_case key; the `UserSession` type expects `updatedAt`.
- The chat route currently calls `anthropic('claude-haiku-4-5-20251001')`; pick the model deliberately for cost vs. quality.
- `@mastra/core` is a dependency but the live chat path uses the Vercel AI SDK directly — decide whether to adopt or drop Mastra.

## Not started

- Multi-car comparison view, PCP/HP finance calculator, email notifications, what-if scenario UI.
- End-to-end testing against real API keys and a live Supabase instance.

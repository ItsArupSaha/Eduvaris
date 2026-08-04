# FrondexAI Production-Solid Plan (Phased)

Fix in phases, verify each before the next. Each phase ends with a runnable, deployable state.

---

## PHASE 1 — Launch Blockers (do this first, deploy immediately after)

### 1.1 Fix Paddle card-payment failure
- **Root cause:** `frontend/.env` missing `VITE_PADDLE_PRICE_ID_STARTER/GROWTH/PRO/SETUP` → `Register.tsx:194` aborts before overlay opens with "Paddle Price ID for the selected plan is not configured."
- **Actions:**
  - Add the 4 missing `VITE_PADDLE_PRICE_ID_*` vars to `frontend/.env.example` with comments showing where to find them in Paddle dashboard.
  - Update the local `frontend/.env` — you'll paste the real Price IDs from Paddle → Catalog → Prices.
  - In `Register.tsx`, when price IDs are missing show a clearer error naming the missing env var.
  - Fix `handlePaddleCheckout` to also pass `PADDLE_PRICE_ID_SETUP` as a second line-item so the $100 setup fee is actually charged (currently defined but never used).

### 1.2 Fix the plan-minutes inconsistency (3 files, 2 different values)
- Centralize plan definitions in ONE place: new `backend/services/plans.py` with `PLANS = {starter:{price:99,minutes:400}, growth:{price:149,minutes:700}, pro:{price:199,minutes:1300}, custom:{...}}`.
- Replace the inline dicts in `dashboard_api.py:893,1172`, `onboarding.py:636,788` with imports from `plans.py`.
- Marketing page already says 700/1300 — code now matches.

### 1.3 Close the cross-tenant auth hole (CRITICAL)
- In `dashboard_api.py`, add a `_require_client_access(client_id, user)` dependency that:
  - Calls `_is_admin(user["sub"])` — if admin, allow.
  - Else requires `str(client_id) == str(user["sub"])` — else 403.
- Apply to every `/api/dashboard/*` endpoint that takes `client_id` (overview, calls, bookings, analytics, settings GET+PUT, vapi-sync, bookings PATCH, knowledge-base upload/reingest, usage). Cancel/reactivate already check inline — leave them.
- Add a regression test: two client JWTs, each can only read their own data.

### 1.4 Harden emergency detection (your "does it properly connect to emergency number?" concern)
- Keep the keyword detector (fast, deterministic, catches the obvious cases).
- ADD a second-pass LLM classifier that runs in `greeting_node` and `qualify_node` whenever the keyword detector returns False but the message contains urgency cues ("water", "smell", "heat", "sparking", "danger", "fire", "leak", etc.). Returns `{is_emergency: bool, reason: str}` via structured output. If True → escalate immediately.
- REMOVE the dead `escalate_call` tool from `tools.py` — the actual transfer is done by the webhook response (`vapi_webhook.py:351-363`). Keep `transfer_to_emergency` and `transfer_to_human` (Vapi-native tools in `vapi_service.py`).

### 1.5 Add recording + AI disclosures to every greeting (COMPLIANCE — illegal in 13 states without it)
- Modify `_system_prompt` and `firstMessage` in `vapi_service.py`:
  - `firstMessage`: `"Thanks for calling {business}, this is {bot_name}. This call may be recorded for quality purposes. How can I help you today?"`
  - Add to system prompt: `"You are an AI assistant. If asked, disclose you are AI. You are not a live dispatcher — for any safety emergency, transfer immediately."`
- Provide a one-shot admin script that calls `update_assistant` for every existing client so deployed agents pick up the new greeting.

### 1.6 Rotate the leaked GitHub PAT
- **You first:** revoke the existing `ghp_...` at github.com/settings/tokens, generate a new one or switch to SSH.
- **Then I'll:** run `git remote set-url origin https://github.com/ItsArupSaha/frontdesk_ai_agent.git` (clean URL, no embedded credentials).
- ⚠️ Also strongly recommend rotating all 8 keys in `backend/.env` (OpenAI, Supabase service_role, Twilio, Google OAuth secret, Paddle) — they were visible in our session. Only you can do this.

### 1.7 Lock down the dev-bypass backdoor
- In `auth.py:53,91`, change `if settings.app_env != "production"` → `if settings.app_env == "development"` to match `dashboard_api._require_auth` (which already does this correctly).
- Set production `APP_ENV=production` in Railway env vars (your action).

---

## PHASE 2 — Reliability & Polish (after Phase 1 is verified live)

### 2.1 Persist call recordings
- Add `recordingUrl` and `stereoRecordingUrl` to `schemas/vapi.py` `Artifact`.
- In `call_service.write_call_log`, accept and persist `recording_url` to the `call_logs.recording_url` column (already exists from migration 007).
- Pass the URL through from `vapi_webhook.py` end-of-call-report handler.
- Frontend `CallLogs.tsx`: show a "Play recording" button when `recording_url` is present.

### 2.2 Fix the working_hours format mismatch
- `calendar_service._parse_working_hours` and `_day_name_to_working_key`: accept BOTH formats — legacy `"8am-6pm"` string AND frontend's `{open:"08:00", close:"18:00"}` dict, case-insensitive day keys.
- Add a normalization helper + unit tests for both shapes.
- Fixes self-serve clients getting correct business hours in slot generation.

### 2.3 Prevent double-booking
- In `calendar_service.book_appointment`, before `events().insert()`, do a final freebusy check on just the slot window. If busy, raise `CalendarBookingError` → caller gets "let me have someone call you back" (already handled).

### 2.4 Tighten voice-agent prompts (your "doesn't speak unnecessarily" concern)
- Add explicit constraints to all 4 node prompts:
  - "Never exceed 2 sentences unless reading back a phone number or address."
  - "Never offer medical, legal, or safety advice — for safety issues, transfer immediately."
  - "Never volunteer information the caller didn't ask for."
  - "If the caller is silent or unclear, ask ONE clarifying question, then wait."
- Add explicit `maxDuration` of ~10 minutes per call in Vapi config to prevent runaway billing.

### 2.5 Remove dead LemonSqueezy code
- Delete `backend/routers/lemon_squeezy_webhook.py`.
- Remove from `main.py:8,81`.
- Remove `lemon_squeezy_webhook_secret` from `config.py` (keep env var accepted via `extra="ignore"` so old deployments don't crash).

### 2.6 Upgrade APP_SECRET_KEY handling
- `encryption.py` derives the Fernet key via raw SHA-256 — not a real KDF. Replace with `PBKDF2HMAC` (100k+ iterations). Provide a one-shot migration script that decrypts existing Google refresh tokens with old key, re-encrypts with new.

---

## What I will NOT change (keeping things simple)
- The LangGraph state machine structure — it's correct.
- The 4-second timeout — Vapi allows up to 7.5s; 4s is a safe margin.
- Deepgram/ElevenLabs choices — appropriate for phone.
- The Paddle webhook signature verification — correct (HMAC-SHA256 with timestamp).
- RLS policies — properly written.
- The `prospector/` folder — unrelated to the shipped product.

---

## Verification at each phase
- **Phase 1:** Manual test of Paddle checkout in sandbox; curl two client JWTs against `/api/dashboard/calls?client_id=X` to confirm 403; test a call where the caller says "I smell gas" but also one where they say "my basement is filling up with water" (no keyword) — both must transfer. Confirm greeting plays the disclosure.
- **Phase 2:** Verify a real call's recording_url appears in the DB + dashboard; unit-test `_parse_working_hours` with both formats; try to double-book a slot.

**Estimated effort:** Phase 1 = ~6-8 hours of focused edits. Phase 2 = ~4-6 hours.

---

## YOUR ACTION ITEMS (only you can do these — I'll remind you when we hit them)
1. **Revoke the GitHub PAT** at github.com/settings/tokens before I change the remote URL.
2. **Rotate the 8 keys in `backend/.env`** (OpenAI, Supabase service_role, Twilio auth token, Google OAuth client secret, Paddle API key) — they were visible in our session.
3. **Provide the 4 Paddle Price IDs** from Paddle dashboard → Catalog → Prices (Starter, Growth, Pro, and the $100 setup fee).
4. **Tell me when ready** to migrate existing client greetings after Phase 1.5 (I'll write a one-shot admin script that calls `update_assistant` for every client row).
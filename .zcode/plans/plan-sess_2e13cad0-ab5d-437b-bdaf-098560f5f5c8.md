## Full UI Redesign — Dark → Light, Clean SaaS, Teal Accent

**Locked decisions:** Teal accent (#0D9488) · Clean minimal hero (drop black hole + particles) · Clean SaaS dashboard (Stripe/Linear vibe) · Everything at once (~44 files).

**Existing reference:** Your 3 legal pages (`PrivacyPolicy`/`TermsOfService`/`RefundPolicy`) are ALREADY light — `bg-[#F8FAFC]`, `bg-white`, `border-slate-200`, `text-slate-800/950/500`, `text-violet-600`. This proves the pattern works. I align everything to a teal-accented version of it.

---

### Foundation (4 files — sets the whole app)

**New light token system — `lib/design-tokens.ts`** (rewrite):
```
bgPrimary:   #F8FAFC (slate-50)     bgSecondary: #FFFFFF
bgElevated:  #FFFFFF                 border:      #E2E8F0 (slate-200)
borderMuted: #EEF2F7                 textPrimary: #0F172A (slate-900)
textSecondary: #334155 (slate-700)   textMuted:   #64748B (slate-500)
textLow:     #94A3B8 (slate-400)
accent:      #0D9488 (teal-600)      accentBright:#14B8A6 (teal-500)
accentSoft:  #CCFBF1 (teal-100)      accentBorder:#5EEAD4 (teal-300)
glow removed (replaced with crisp shadows)
shadows: button/card/panel = soft slate drop-shadows (no neon)
```

**`index.css`** — flip `:root` (white bg, slate-900 text), `body` (light — drop violet radial, add subtle slate gradient or none), `::selection` (teal-100 bg, slate-900 text). Remove `.task-feed-mask` dark gradients (the FeatureRow task-feed visual is being rebuilt, see below).

**`index.html`** — add Inter webfont via `<link>` (Google Fonts: Inter 400-700 + preconnect). Currently Inter is referenced but never loaded → falls back to system UI. This fixes typography across the board.

**`tailwind.config.ts`** — update `boxShadow` (drop neon `glow`/`orb`, add `soft`/`card`), `backgroundImage` (drop `purple-gradient`, add `teal-gradient`), keep `transitionTimingFunction.premium`. Add `teal` is already in default Tailwind palette — no extension needed.

---

### App Shell + Navigation (3 files)

**`AppShell.tsx`** — root `bg-[#F1F5F9]` (slate-100), REMOVE the 3 dark decorative layers (radial orbs + dim overlay). Main content vessel → `bg-white border border-slate-200 shadow-sm rounded-[24px]`. SuspendedScreen → light with rose accents.

**`DashboardSidebar.tsx`** — sidebar panel `bg-white border-r border-slate-200`. Active nav: `bg-teal-50 border-teal-200 text-teal-700`. Inactive: `text-slate-600 hover:bg-slate-100`. Icon chips: `bg-slate-100` idle, `bg-teal-100 text-teal-700` active. Mobile drawer: `bg-white`, scrim `bg-slate-900/40`.

**`Navbar.tsx`** (public top bar) — `bg-white/80 backdrop-blur border-b border-slate-200`. Logo black text. Links slate-600 hover slate-900. "Get Started" button → teal-600 bg. Avatar dropdown → `bg-white border border-slate-200 shadow-lg`.

---

### Dashboard pages (7 files) + widgets (5 files)

All move to: `bg-white border border-slate-200 rounded-2xl shadow-sm` cards on the `#F1F5F9` shell bg.

**`MetricCard.tsx`** — rewrite `shellMap` to light: white card + colored left-border or colored icon chip (teal-50/emerald-50/amber-50/rose-50/slate-50 bg + matching -600 text). Value slate-900, label slate-500. Prop API unchanged.

**`StatusBadge.tsx`** — keep status→semantic mapping, swap to light pairs: emergency=`bg-rose-50 text-rose-700`, booked=`bg-emerald-50 text-emerald-700`, completed=`bg-sky-50 text-sky-700`, cancelled=`bg-slate-100 text-slate-600`, in_progress=`bg-amber-50 text-amber-700`.

**`UsageMeter.tsx`** — switch from `var(--*)` dark tokens to light equivalents. Bar normal=teal-500, ≥80%=amber, over=rose. White card.

**`Dashboard.tsx`** — teal chart line (`#14B8A6`), gridlines `#E2E8F0`, ticks slate-400, tooltip `bg-white border-slate-200`. Recent calls list with slate-600 text.

**`Analytics.tsx`, `Bookings.tsx`, `CallLogs.tsx`** — same card treatment. Charts: teal/emerald strokes on light grids. Inputs `bg-white border-slate-300 focus:border-teal-500 focus:ring-teal-500/20`. CallRow expand → `bg-slate-50`.

**`Settings.tsx`** — Section wrapper light card, AgentToggle switch (teal on / slate off), working-hours mini-cards `bg-slate-50`, KB dropzone `border-dashed border-slate-300`. Plan picker → teal selected state.

**`SetupGuide.tsx`** — done steps `border-emerald-200 bg-emerald-50`, pending `border-slate-200 bg-white`, progress bar `from-teal-500 to-emerald-400`.

---

### Auth pages (4 files)

**`Login.tsx`** — light bg, left branding panel `bg-gradient-to-br from-teal-600 to-teal-700` (white text), right form white card. Inputs light, submit button teal-600. Same 2-col split.

**`Register.tsx`** — same treatment. Left panel teal gradient, wizard card white. Plan selector selected=`border-teal-500 bg-teal-50`. Order summary light. Success screen light with teal check.

**`SetPassword.tsx`** — light minimal card, teal button.

**`FeedbackPage.tsx`** — light card, type selector teal active state. (Decide: move inside AppShell? Recommend keep standalone — it's a simple form.)

---

### Marketing pages (3 files) + components (12 files)

**`LandingPage.tsx`** — light bg. Sections on white/slate-50. Comparison table: white rows, teal "us" column tint, "Setup fee: None" highlight.

**`Hero.tsx`** — **REBUILD clean & minimal**: drop `ParticleField` + `BlackHoleVisual`. Light hero with headline (slate-900), subtext (slate-600), two buttons (teal-600 primary + white/slate border secondary), subtle teal gradient mesh or faint grid pattern background. Keep framer-motion entrance but simpler/faster (no 1.5s black-hole delay).

**`FeatureRow.tsx`** (largest, 752 lines) — **rebuild the 4 visual mockups as light UI**: EmergencyDispatch/LiveBooking/FollowUp/TaskFeed become light "dashboard screenshots" (white panels, slate borders, teal/emerald/rose accents, no neon glow). The infinite-loop animations become subtle. `.task-feed-mask` CSS rebuilt for light (slate fade gradients).

**`PricingCard.tsx`, `BenefitCard.tsx`, `ProcessCard.tsx`, `TestimonialCard.tsx`, `FAQItem.tsx`, `SectionHeading.tsx`, `Footer.tsx`, `CTASection.tsx`** — all to light: white cards, slate borders, teal accents, teal check icons. ProcessCard watermark number `text-slate-100`.

**`SectionParticleLayer.tsx`** — replace violet radial glow with subtle teal tint OR remove (clean look). Keep as thin optional layer.

**`ParticleField.tsx`** + **`BlackHoleVisual.tsx`** — no longer used by hero. Leave files but they're dead (Hero rebuilt). Can delete later.

**`PaymentPage.tsx`** — light cards, teal featured CTA. Refactor: import shared `plans` from `data/landing.tsx` instead of duplicate (fixes drift hazard). Remove the duplicated card markup, reuse `PricingCard` or a shared render.

**`PublicOnboarding.tsx`** — light StepCards, light inputs, teal chips/progress.

---

### Onboarding/Admin (3 files)

**`AdminPanel.tsx`** (48KB, biggest) — table + modals to light: white table rows, slate headers, modal `bg-white shadow-xl`, inputs light, badges light. Status colors via StatusBadge.

**`ClientOnboarding.tsx`** — light wizard, same as PublicOnboarding pattern.

**`AppSuspenseFallback.tsx` + `ProtectedRoute.tsx`** — spinner bg `bg-slate-50`, spinner border teal.

---

### Already-light (touch minimally)

`PrivacyPolicy.tsx`, `TermsOfService.tsx`, `RefundPolicy.tsx` — already light with violet accents. Swap `text-violet-600` → `text-teal-600` for consistency (small find-replace per file).

---

### Orphaned components — delete

`CTASection.tsx`, `TestimonialCard.tsx`, `ShowcaseSection.tsx`, `SolutionsMarquee.tsx` — not imported anywhere. **Delete** to reduce dead code (the testimonials data + showcaseBullets in landing.tsx also unused → remove). Cleaner repo. (Reversing: if you want testimonials later, they're easy to re-add.)

---

### Execution order (within this single pass)
1. Foundation: `index.html`, `index.css`, `tailwind.config.ts`, `design-tokens.ts`
2. Shell: `AppShell`, `DashboardSidebar`, `Navbar`, `Footer`
3. Widgets: `MetricCard`, `StatusBadge`, `UsageMeter`, `LoadingSpinner`, `CallRow`
4. Dashboard pages: `Dashboard`, `Analytics`, `Bookings`, `CallLogs`, `Settings`, `SetupGuide`, `FeedbackPage`
5. Auth: `Login`, `Register`, `SetPassword`
6. Marketing: `LandingPage`, `Hero` (rebuild), `FeatureRow` (rebuild), card components, `PaymentPage`, `PublicOnboarding`
7. Admin: `AdminPanel`, `ClientOnboarding`, fallbacks
8. Legal: violet→teal accent swap
9. Delete orphaned components
10. Verify: `npx tsc --noEmit` + `npm run build` pass; grep for residual `text-white`, `bg-[#0`, `border-white/`, `bg-white/[0.0`

### I'll verify before done
- `npx tsc --noEmit` clean
- `npm run build` succeeds
- No residual dark-mode classes in live code (grep `text-white`, `bg-[#0`, `border-white/`, `bg-white/\[0.0`, `#7C3AED`, `rgba(0,0,0`)

### What you get
- Cohesive light theme, teal-accented, modern Stripe/Linear feel
- Inter actually loaded (sharp typography)
- Clean hero (no black hole), rebuilt light feature mockups
- Dashboard that's scannable and not boring — colored metric chips, crisp charts
- Dead code removed
- One deploy, everything consistent

**I will NOT deploy** — I'll build/verify locally and commit to a branch. You review then deploy frontend via Vercel when ready.
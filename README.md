# stride.

> An AI running coach built by a runner, for runners — because Strava tells you what you did, but the kudos aren't going to get you to the finish line.

**[Live Demo](https://stride-coach-alpha.vercel.app)**

---

## The Backstory

I run. A lot. Half marathons, obstacle races, treks, the whole thing. And I log everything on Strava obsessively. But Strava just shows you your data — it doesn't tell you if you're training smart, if you're overreaching, or how to actually get to that sub-60 10K you've been chasing.

What I used to do was screenshot my Strava stats and paste them into Claude — asking it to be my personal coach, break down my week, tell me what to fix. It worked surprisingly well. Then I thought: why am I doing this manually every single time? Why not just build the thing properly?

So I built Stride.

The idea started simple: pull my Strava runs, flag when I'm overtraining, show me a weekly report with some actual coaching language. But it grew into something I genuinely use — an AI coach that knows my real data, talks to me in the voice I want, builds my training calendar around my actual race schedule, and rewrites the plan when I inevitably go off script.

On the voice thing — I wanted two modes. Some days I need someone to be rough and tough on me, call out that I ran too hard on an easy day, not let me off the hook. Other days I just need someone to hype me up and tell me I'm doing great even when I'm clearly not. So I built both: **Tough Love** and **Hype Girl**. The entire app shifts tone based on whichever you pick — one-liners, chat replies, weekly reports, all of it.

I built this entirely by myself, which meant making a lot of architectural decisions solo and learning a few hard lessons along the way.

---

## What Stride Does

**My Runs** — Pulls your Strava activities in real time, classifies each run by HR zone (easy / tempo / hard), and generates a one-liner from your coach for every single run. Click into any run and chat with your coach about it.

**Coach Personality Toggle** — Tough Love (direct, data-driven, no sugarcoating) or Hype Girl (your biggest fan, always). One switch in the navbar changes the entire app's voice.

**Weekly Report** — Every Sunday at 7pm, Stride auto-generates a narrative report: total km, load change vs last week, easy run compliance %, overtraining flags, and a 10K race time predictor that updates every week based on your HR-pace correlation.

**Training Calendar** — The main thing. You pin your races with your preferences (runs per week, gym days, notes to coach like "my knee is sore" or "I want to focus on speed"), and Stride generates a rolling 6-week training plan around all of them. When you add Ladakh HM, then Delhi HM, then Mumbai Full — it builds one continuous calendar that accounts for tapers, recovery weeks, and the fact that your races are 4 weeks apart.

**Resync** — Hit resync anytime and Stride pulls your last few weeks of actual Strava data, compares it against the plan, and rewrites the upcoming weeks. Ran less than planned? It backs off. Smashing your targets? It pushes harder.

**Route Map** — Leaflet.js renders your actual Strava route polyline on every run detail page.

**Pace Trend Chart** — Tracks your easy-pace improvement over time (pace at HR < 150bpm) — the real fitness signal. If you're running 30 seconds/km faster at the same heart rate than 6 weeks ago, that's fitness.

---

## The Architectural Decision That Changed Everything

I started building this with **separate training plans per goal** — you'd create a "Ladakh HM plan" and a "Delhi HM plan" as independent 12-week blocks. It worked, kind of. But then I looked at my actual race calendar:

```
Ladakh HM  →  Sept 20
Delhi HM   →  Oct 18   (4 weeks later)
Kolkata    →  Dec 20   (9 weeks later)
Mumbai     →  Jan 17   (4 weeks later)
```

Four separate 12-week plans would completely overlap and contradict each other. That's not how real runners train. You don't restart from zero after every race — you have one continuous training arc with races as milestones along the way.

So I scrapped the multi-plan model and built a **unified calendar** instead. Race pins are just markers on a single continuous timeline. The plan generates around all of them simultaneously — tapering before each race, recovering after, building back up for the next one. Much closer to how an actual coach would think about it.

---

## The Auth Decision I Had to Make Mid-Build

I started with **session cookies** for auth (standard express-session). Worked fine locally. Deployed to Railway + Vercel and immediately broke — the browser was blocking cross-origin cookies because the frontend (Vercel) and backend (Railway) are on different domains, and `SameSite: none` cookies require very specific conditions.

Instead of fighting the browser, I switched to **JWT** stored in localStorage. The token gets attached to every request as an `Authorization: Bearer` header. No cookie drama, no cross-domain headaches. Lesson learned: session cookies and split deployments don't play nice without extra infrastructure.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Auth | Strava OAuth 2.0 + JWT |
| AI | Anthropic Claude API (Haiku) |
| Maps | Leaflet.js |
| Charts | Recharts |
| Scheduler | node-cron |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## How the AI Bits Work

**One-liners** — Each run gets a one-line coach reaction generated by Claude Haiku, prompted with distance, pace, avg HR, and max HR. Two completely different system prompts depending on coach mode.

**Chat** — Per-run chat with full conversation history passed on every turn. Claude is given the run's stats as context and told to stay on topic.

**Weekly Report** — Claude gets a summary of the week (total km, load change, easy run compliance, individual run breakdown) and writes a 3-4 sentence coaching narrative.

**Training Plan** — Generated in batches of 4 weeks to avoid token limits. Each batch gets context about all upcoming race pins, preferences, and recent run data. Claude outputs raw JSON which gets parsed and stored.

**Resync** — Claude gets completed weeks (planned vs actual km, compliance %), recent run data, and upcoming pins. It assesses fitness vs plan and regenerates remaining weeks accordingly.

The trickiest prompt engineering was getting Claude to reliably output raw JSON without markdown fences. Solution: very explicit instructions ("start with [ end with ]"), concrete examples in the prompt, and a `parseJSON()` helper that strips fences as a fallback.

---

## Features at a Glance

- Strava OAuth 2.0 login
- Live activity sync + caching
- HR zone classification per run (easy / moderate / tempo / hard)
- AI one-liner per run, in your coach's voice
- Per-run coach chat with conversation history
- Weekly report auto-generated every Sunday 7pm IST
- 10K race time predictor (Riegel's formula + HR-pace correlation)
- Unified training calendar with race pins
- Rolling 6-week plan generation
- Gym days + runs per week preferences per race
- Adaptive resync against real Strava data
- Route map (Leaflet + Strava polyline)
- Pace trend chart (Recharts)
- Notification bell for plan updates
- Tough Love / Hype Girl coach toggle

---

## What I Learnt Building This

**Cross-domain auth is genuinely annoying.** Session cookies + split deployments = a bad time. JWT is the right call for this architecture.

**LLM JSON parsing needs defensive code.** Claude sometimes wraps JSON in markdown fences even when you explicitly tell it not to. Always sanitise before parsing.

**Batch your LLM calls for long outputs.** Asking Claude for a 12-week plan in one shot gets truncated. 4 weeks at a time, stitched together — much more reliable.

**The product decision matters more than the code.** The shift from per-goal plans to a unified calendar wasn't a technical change — it was a product insight. The code change took an afternoon. The insight took staring at my race schedule and realising the model was wrong.

**Real data makes everything better.** Demoing this with my actual Strava runs — real heart rates, real paces, real routes — is infinitely more compelling than mock data. Build things you actually use.



---

Built with a lot of early morning runs, a few overtraining weeks, and the very real need for someone to tell me to slow down (not that I am the fastest you ykwim).

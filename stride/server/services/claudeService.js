import Anthropic from '@anthropic-ai/sdk';
import { speedToPace, metresToKm, formatDuration } from './stravaService.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PERSONAS = {
  fire: `You are a tough-love running coach. Direct, data-driven, no sugarcoating. 
You call out mistakes without being cruel and only praise when truly earned. 
Keep responses concise — 2-3 sentences max.`,

  cheer: `You are an enthusiastic hype-girl running coach. Warm, energetic, celebratory. 
You acknowledge concerns but always frame them positively. Use exclamation points freely. 
Keep responses concise — 2-3 sentences max.`,
};

function parseJSON(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

export async function generateRunOneliner(run, coachMode = 'fire') {
  const prompt = `Generate one punchy sentence (max 20 words) about this run:
- Distance: ${metresToKm(run.distance)}km
- Pace: ${speedToPace(run.average_speed)}/km  
- Avg HR: ${run.average_heartrate ? Math.round(run.average_heartrate) + 'bpm' : 'unknown'}
- Max HR: ${run.max_heartrate ? Math.round(run.max_heartrate) + 'bpm' : 'unknown'}
- Duration: ${formatDuration(run.moving_time)}

Output only the sentence, no quotes.`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    system: PERSONAS[coachMode],
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].text.trim();
}

export async function chatWithCoach(run, userMessage, history = [], coachMode = 'fire') {
  const system = `${PERSONAS[coachMode]}

The athlete is asking about this run:
- Date: ${new Date(run.start_date).toDateString()}
- Distance: ${metresToKm(run.distance)}km
- Pace: ${speedToPace(run.average_speed)}/km
- Avg HR: ${run.average_heartrate ? Math.round(run.average_heartrate) + 'bpm' : 'unknown'}
- Max HR: ${run.max_heartrate ? Math.round(run.max_heartrate) + 'bpm' : 'unknown'}
- Elevation: ${Math.round(run.total_elevation_gain || 0)}m

Answer only about this run and training. 2-3 sentences max.`;

  const messages = [...history, { role: 'user', content: userMessage }];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system,
    messages,
  });

  return response.content[0].text.trim();
}

export async function generateTrainingPlan(goal, currentWeeklyKm, weeksUntilRace, coachMode = 'fire') {
  const cappedWeeks = Math.min(12, weeksUntilRace);
  const allWeeks = [];
  const batchSize = 4;

  for (let start = 1; start <= cappedWeeks; start += batchSize) {
    const end = Math.min(start + batchSize - 1, cappedWeeks);
    const batchCount = end - start + 1;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + (start - 1) * 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const prompt = `Generate weeks ${start} to ${end} of a ${cappedWeeks}-week training plan.

Goal: ${goal.race_distance} — ${goal.race_name}
Target time: ${goal.goal_time || 'just finish'}
Current weekly mileage: ${currentWeeklyKm}km/week
These are weeks ${start}-${end} of ${cappedWeeks} total weeks.
First week in this batch starts: ${weekStartStr}

Generate exactly ${batchCount} weeks as a JSON array.
Each week has 7 days (monday to sunday).
For each day:
- type: "easy" | "tempo" | "intervals" | "long" | "rest" | "race"
- distance: km as number (0 for rest)
- detail: one sentence with key target (HR or pace)

Principles:
- 80% easy, 20% quality
- Long run sunday, rest tuesday and friday
- Progressive overload, cutback every 4th week
- Taper final 2 weeks

IMPORTANT: Start response with [ and end with ]. Raw JSON only, no markdown.

[
  {
    "week_number": ${start},
    "week_start": "YYYY-MM-DD",
    "total_km": 30,
    "days": [
      { "day": "monday", "type": "easy", "distance": 6, "detail": "Easy 6km keeping HR below 145bpm." },
      { "day": "tuesday", "type": "rest", "distance": 0, "detail": "Full rest day." },
      { "day": "wednesday", "type": "easy", "distance": 6, "detail": "Easy 6km at conversational pace." },
      { "day": "thursday", "type": "easy", "distance": 5, "detail": "Easy 5km focusing on cadence." },
      { "day": "friday", "type": "rest", "distance": 0, "detail": "Full rest day." },
      { "day": "saturday", "type": "tempo", "distance": 6, "detail": "Tempo 6km at threshold pace." },
      { "day": "sunday", "type": "long", "distance": 14, "detail": "Long run at easy effort." }
    ]
  }
]`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      system: PERSONAS[coachMode],
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].text.trim();
    const batch = parseJSON(text);
    allWeeks.push(...batch);
  }

  return allWeeks;
}

export async function adaptTrainingWeek(plannedWeek, actualRuns, nextWeek, coachMode = 'fire') {
  const prompt = `A runner's training week didn't go exactly as planned. Adapt next week accordingly.

Planned this week:
${JSON.stringify(plannedWeek.planned_runs, null, 2)}

What actually happened:
${JSON.stringify(actualRuns, null, 2)}

Next week was planned as:
${JSON.stringify(nextWeek.planned_runs, null, 2)}

Analyse the difference and adjust next week's plan if needed.

IMPORTANT: Start response with { and end with }. Raw JSON only, no markdown.

{
  "adjustment_needed": true,
  "adjustment_note": "one sentence explaining what changed and why",
  "updated_days": [
    { "day": "monday", "type": "easy", "distance": 6, "detail": "Easy 6km keeping HR below 145bpm." },
    { "day": "tuesday", "type": "rest", "distance": 0, "detail": "Full rest day." },
    { "day": "wednesday", "type": "easy", "distance": 6, "detail": "Easy 6km at conversational pace." },
    { "day": "thursday", "type": "easy", "distance": 5, "detail": "Easy 5km focusing on cadence." },
    { "day": "friday", "type": "rest", "distance": 0, "detail": "Full rest day." },
    { "day": "saturday", "type": "tempo", "distance": 6, "detail": "Tempo 6km at threshold pace." },
    { "day": "sunday", "type": "long", "distance": 14, "detail": "Long run at easy effort." }
  ]
}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: PERSONAS[coachMode],
    messages: [{ role: 'user', content: prompt }],
  });

  const text = msg.content[0].text.trim();
  return parseJSON(text);
}

export async function generateWeeklyReport(summary, runs, coachMode = 'fire') {
  const runLines = runs.slice(0, 7).map(r =>
    `• ${new Date(r.start_date).toDateString()}: ${metresToKm(r.distance)}km at ${speedToPace(r.average_speed)}/km, avg HR ${r.average_heartrate ? Math.round(r.average_heartrate) + 'bpm' : 'no HR'}`
  ).join('\n');

  const prompt = `Write a weekly training report based on this data.

Summary:
- Total: ${summary.totalKm}km across ${summary.totalRuns} runs
- Load change vs last week: ${summary.loadChangePct > 0 ? '+' : ''}${summary.loadChangePct}%
- Easy run compliance (HR < 145bpm): ${summary.easyRunPct}%
- Status: ${summary.status}

Runs this week:
${runLines}

Write 3-4 sentences: what went well, any concerns, one concrete action for next week. Don't use the athlete's name.`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: PERSONAS[coachMode],
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].text.trim();
}
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

export async function generateCalendarBlock(fromDate, toDate, racePins, currentWeeklyKm, recentRuns, coachMode = 'fire') {
  const weeksToGenerate = Math.ceil((new Date(toDate) - new Date(fromDate)) / (7 * 24 * 60 * 60 * 1000));
  const cappedWeeks = Math.min(12, weeksToGenerate);

  const pinsContext = racePins.map(pin => {
    const gymDaysArr = Array.isArray(pin.gym_days)
      ? pin.gym_days
      : typeof pin.gym_days === 'string'
        ? JSON.parse(pin.gym_days || '[]')
        : [];
    return `
- ${pin.race_name} (${pin.race_distance}) on ${pin.race_date}
  Runs per week: ${pin.runs_per_week}
  Gym days: ${gymDaysArr.join(', ') || 'none'}
  Notes: ${pin.notes || 'none'}
  Goal time: ${pin.goal_time || 'just finish'}
  Weeks away: ${Math.ceil((new Date(pin.race_date) - new Date(fromDate)) / (7 * 24 * 60 * 60 * 1000))}`;
  }).join('\n');

  const recentContext = recentRuns.slice(0, 6).map(r =>
    `• ${metresToKm(r.distance)}km at ${speedToPace(r.average_speed)}/km, HR ${r.average_heartrate ? Math.round(r.average_heartrate) + 'bpm' : 'unknown'}`
  ).join('\n');

  const prompt = `Generate a ${cappedWeeks}-week training calendar block.

Athlete current fitness:
- Weekly mileage: ${currentWeeklyKm}km
- Recent runs:
${recentContext}

Upcoming races (plan around these):
${pinsContext}

Rules:
- Respect each race's runs_per_week preference
- Put gym on specified gym days (type: "gym", distance: 0)
- Taper 1 week before each race (reduce volume 30%, no hard sessions)
- Add recovery week after each race (easy runs only, 40% volume)
- Progressive overload — increase volume max 10% per week
- Long run on sunday, rest on tuesday unless athlete specifies otherwise

Generate exactly ${cappedWeeks} weeks.

IMPORTANT: Start response with [ and end with ]. Raw JSON only, no markdown.

[
  {
    "week_number": 1,
    "week_start": "YYYY-MM-DD",
    "days": [
      { "day": "monday", "type": "easy", "distance": 6, "detail": "Easy 6km HR below 145bpm." },
      { "day": "tuesday", "type": "rest", "distance": 0, "detail": "Rest day." },
      { "day": "wednesday", "type": "gym", "distance": 0, "detail": "Gym session." },
      { "day": "thursday", "type": "easy", "distance": 5, "detail": "Easy 5km." },
      { "day": "friday", "type": "rest", "distance": 0, "detail": "Rest day." },
      { "day": "saturday", "type": "tempo", "distance": 6, "detail": "Tempo 6km." },
      { "day": "sunday", "type": "long", "distance": 12, "detail": "Long run 12km easy effort." }
    ]
  }
]`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: PERSONAS[coachMode],
    messages: [{ role: 'user', content: prompt }],
  });

  return parseJSON(msg.content[0].text.trim());
}

export async function resyncCalendar(fromDate, racePins, completedSummary, actualRuns, currentWeeklyKm, weeksToGen, coachMode = 'fire') {
  const cappedWeeks = Math.min(12, weeksToGen);

  const pinsContext = racePins.map(pin => {
    const gymDaysArr = Array.isArray(pin.gym_days)
      ? pin.gym_days
      : typeof pin.gym_days === 'string'
        ? JSON.parse(pin.gym_days || '[]')
        : [];
    return `
- ${pin.race_name} (${pin.race_distance}) on ${pin.race_date}
  Runs per week: ${pin.runs_per_week}
  Gym days: ${gymDaysArr.join(', ') || 'none'}
  Notes: ${pin.notes || 'none'}
  Weeks away: ${Math.ceil((new Date(pin.race_date) - new Date(fromDate)) / (7 * 24 * 60 * 60 * 1000))}`;
  }).join('\n');

  const recentContext = actualRuns.slice(0, 8).map(r =>
    `• ${metresToKm(r.distance)}km at ${speedToPace(r.average_speed)}/km, HR ${r.average_heartrate ? Math.round(r.average_heartrate) + 'bpm' : 'unknown'}`
  ).join('\n');

  const completedContext = completedSummary.length
    ? completedSummary.map(w =>
        `Week ${w.week_number}: planned ${w.planned_km}km, actual ${w.actual_km}km (${w.compliance}% compliance)`
      ).join('\n')
    : 'No completed weeks yet';

  const prompt = `Resync a running training calendar based on actual performance.

Current weekly mileage: ${currentWeeklyKm}km
Recent runs:
${recentContext}

Completed weeks:
${completedContext}

Upcoming races:
${pinsContext}

Assess performance and regenerate the next ${cappedWeeks} weeks.

IMPORTANT: Start response with { and end with }. Raw JSON only, no markdown.

{
  "assessment": "2-3 sentence assessment of fitness vs plan",
  "adjustment": "ahead",
  "weeks": [
    {
      "week_number": 1,
      "week_start": "YYYY-MM-DD",
      "days": [
        { "day": "monday", "type": "easy", "distance": 6, "detail": "Easy 6km HR below 145bpm." },
        { "day": "tuesday", "type": "rest", "distance": 0, "detail": "Rest day." },
        { "day": "wednesday", "type": "gym", "distance": 0, "detail": "Gym session." },
        { "day": "thursday", "type": "easy", "distance": 5, "detail": "Easy 5km." },
        { "day": "friday", "type": "rest", "distance": 0, "detail": "Rest day." },
        { "day": "saturday", "type": "tempo", "distance": 6, "detail": "Tempo 6km." },
        { "day": "sunday", "type": "long", "distance": 12, "detail": "Long run 12km easy effort." }
      ]
    }
  ]
}`;

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system: PERSONAS[coachMode],
    messages: [{ role: 'user', content: prompt }],
  });

  return parseJSON(msg.content[0].text.trim());
}
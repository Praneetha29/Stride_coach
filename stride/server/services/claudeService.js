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
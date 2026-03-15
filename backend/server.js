// SkillBridge Backend — Pure Node.js (zero dependencies)
// Handles: score-interview API, Bolna webhook, outbound call trigger
// Run with: node server.js

import http from "http";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ─── Load .env manually (no dotenv needed) ───────────────────────────────────
const log = (...args) => {
  console.log(new Date().toISOString(), ...args)
}
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, ".env");
if (existsSync(envPath)) {
  readFileSync(envPath, "utf8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k && !k.startsWith("#") && v.length) {
      process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
}

// ─── Tiny router ─────────────────────────────────────────────────────────────
const routes = {};
function route(method, path, handler) {
  routes[`${method}:${path}`] = handler;
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  console.log("➡️", req.method, req.url)
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    });
    return res.end();
  }

  // Match route (strip trailing slash, handle params)
  const urlPath = req.url.split("?")[0].replace(/\/$/, "") || "/";
  const key = `${req.method}:${urlPath}`;
  const handler = routes[key];

  if (handler) {
    try {
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};
      await handler(req, res, body);
    } catch (err) {
      console.error("Handler error:", err);
      send(res, 500, { error: err.message });
    }
  } else {
    // Try dynamic param routes like /api/results/:id
    const dynamicHandler = matchDynamic(req.method, urlPath);
    if (dynamicHandler) {
      try {
        const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};
        await dynamicHandler.handler(req, res, body, dynamicHandler.params);
      } catch (err) {
        send(res, 500, { error: err.message });
      }
    } else {
      send(res, 404, { error: `Cannot ${req.method} ${urlPath}` });
    }
  }
});

// ─── Dynamic param route matcher ─────────────────────────────────────────────
const dynamicRoutes = [];
function routeDynamic(method, pattern, handler) {
  // pattern like /api/results/:call_sid
  const keys = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; });
  dynamicRoutes.push({ method, regex: new RegExp(`^${regexStr}$`), keys, handler });
}
function matchDynamic(method, path) {
  for (const r of dynamicRoutes) {
    if (r.method !== method) continue;
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { handler: r.handler, params };
    }
  }
  return null;
}

// ─── In-memory store ──────────────────────────────────────────────────────────
const candidates = new Map();
const callResults = new Map();

// ─── Score engine ─────────────────────────────────────────────────────────────
const QUALITY_SCORES = { excellent: 25, good: 20, average: 12, poor: 5 };
const CONFIDENCE_BONUS = { high: 10, medium: 5, low: 0 };

function computeScore(body) {
  const base =
    (QUALITY_SCORES[body.q1_answer_quality] || 10) +
    (QUALITY_SCORES[body.q2_answer_quality] || 10) +
    (QUALITY_SCORES[body.q3_answer_quality] || 10) +
    (QUALITY_SCORES[body.q4_answer_quality] || 10);
  const bonus = CONFIDENCE_BONUS[body.candidate_confidence] || 0;
  const total = Math.min(base + bonus, 100);
  let grade, readiness, coaching_tips;
  if (total >= 80) {
    grade = "A"; readiness = "Interview Ready";
    coaching_tips = [
      "You're well-prepared! Focus on a strong first impression — firm handshake, confident eye contact.",
      "Bring printed copies of your certifications or experience letters to the interview.",
    ];
  } else if (total >= 60) {
    grade = "B"; readiness = "Almost Ready";
    coaching_tips = [
      "Practice using the STAR method: Situation, Task, Action, Result for each answer.",
      "Prepare 2 specific examples of problems you solved on previous jobs.",
    ];
  } else if (total >= 40) {
    grade = "C"; readiness = "Needs More Practice";
    coaching_tips = [
      "Write down 3 specific jobs you've completed and practice describing them out loud before the interview.",
      "Focus on safety knowledge — employers in this field care deeply about compliance.",
    ];
  } else {
    grade = "D"; readiness = "More Prep Needed";
    coaching_tips = [
      "Research the company and the role before your interview — even 10 minutes helps.",
      "Practice answering 'Tell me about yourself' — keep it under 2 minutes, focused on work experience.",
    ];
  }
  return { score: total, grade, readiness, coaching_tips };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/stats
route("GET", "/api/stats", (req, res) => {
  const allResults = Array.from(callResults.values());
  const allCandidates = Array.from(candidates.values());
  const completed = allResults.filter(r => r.status === "completed");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + (r.score || 0), 0) / completed.length) : 0;
  const readyCount = completed.filter(r =>
    ["Interview Ready", "Almost Ready"].includes(r.readiness)).length;
  send(res, 200, {
    total_candidates: allCandidates.length,
    calls_completed: completed.length,
    calls_in_progress: allCandidates.filter(c => c.status === "calling").length,
    average_score: avgScore,
    ready_for_interview: readyCount,
  });
});

// GET /api/candidates
route("GET", "/api/candidates", (req, res) => {

  log("GET /api/candidates")

  const list = Array.from(candidates.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(c => {
      const result = c.current_call_sid
        ? callResults.get(c.current_call_sid)
        : null

      return {
        ...c,
        last_result: result || null
      }
    })

  log("Candidates returned:", list.length)

  send(res, 200, list)
})

// POST /api/candidates
route("POST", "/api/candidates", (req, res, body) => {

  log("POST /api/candidates")
  log("Payload:", body)

  const { name, phone, job_role, employer_name } = body

  if (!name || !phone || !job_role) {
    log("❌ Missing required fields")
    return send(res, 400, { error: "name, phone, job_role required" })
  }

  const id = `cand_${Date.now()}`

  const candidate = {
    id,
    name,
    phone,
    job_role,
    employer_name: employer_name || "SkillBridge Partner",
    status: "pending",
    created_at: new Date().toISOString(),
    current_call_sid: null,
    last_result: null
  }

  candidates.set(id, candidate)

  log("✅ Candidate stored:", id)

  send(res, 200, { success: true, candidate })
})

// POST /api/trigger-call
route("POST", "/api/trigger-call", async (req, res, body) => {

  log("POST /api/trigger-call")
  log("Payload:", body)

  const { candidate_id } = body

  const candidate = candidates.get(candidate_id)

  if (!candidate) {
    log("❌ Candidate not found")
    return send(res, 404, { error: "Candidate not found" })
  }

  log("Calling candidate:", candidate.name, candidate.phone)

  const BOLNA_API_KEY = process.env.BOLNA_API_KEY
  const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID

  try {

    const bolnaRes = await fetch("https://api.bolna.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BOLNA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: BOLNA_AGENT_ID,
        recipient_phone_number: candidate.phone,
        variables: {
          candidate_name: candidate.name,
          job_role: candidate.job_role,
          employer_name: candidate.employer_name
        }
      })
    })

    const data = await bolnaRes.json()

    log("Bolna response:", data)

    candidate.current_call_sid = data.call_id || data.id
    candidate.status = "calling"

    candidates.set(candidate_id, candidate)

    send(res, 200, { success: true })

  } catch (err) {

    log("❌ Bolna call failed:", err)

    send(res, 500, { error: err.message })

  }
})

// POST /api/score-interview  (called BY Bolna mid-call via custom function)
route("POST", "/api/score-interview", (req, res, body) => {
  console.log("[score-interview] called:", body.candidate_name, body.job_role);
  if (!body.candidate_name || !body.job_role || !body.call_sid)
    return send(res, 400, { error: "Missing required fields" });

  const { score, grade, readiness, coaching_tips } = computeScore(body);
  const result = {
    call_sid: body.call_sid,
    candidate_name: body.candidate_name,
    job_role: body.job_role,
    score, grade, readiness, coaching_tips,
    language_used: body.language_used || "english",
    candidate_confidence: body.candidate_confidence || "medium",
    scored_at: new Date().toISOString(),
    status: "scored",
  };
  callResults.set(body.call_sid, result);
  send(res, 200, {
    score, grade, readiness,
    coaching_tip_1: coaching_tips[0],
    coaching_tip_2: coaching_tips[1],
    message: `Score recorded: ${score}/100 (Grade ${grade})`,
  });
});

// POST /api/webhook  (called BY Bolna after call ends)
route("POST", "/api/webhook", (req, res, payload) => {
  console.log("[webhook] payload received:", JSON.stringify(payload, null, 2));

  if (!payload) return send(res, 200, { ok: true });

  // Bolna sometimes sends:
  // { event: "call_completed", data: {...} }
  // or
  // { call_sid: "...", status: "completed" }

  const event = payload.event;
  const data = payload.data || payload;

  const callSid = data.call_sid || data.id;
  const status = data.status || event;

  if (!callSid) {
    console.log("⚠️ No callSid found in webhook");
    return send(res, 200, { ok: true });
  }

  if (
    status === "completed" ||
    status === "ended" ||
    event === "call_completed"
  ) {
    const existing = callResults.get(callSid) || {};

    const enriched = {
      ...existing,
      call_sid: callSid,
      status: "completed",
      duration_seconds: data.duration || 0,
      transcript: data.transcript || [],
      recording_url: data.recording_url || null,
      ended_at: new Date().toISOString(),
    };

    if (data.extracted_data) {
      const ed = data.extracted_data;
    
      Object.assign(enriched, {
        candidate_name: enriched.candidate_name || ed.candidate_name,
        job_role: enriched.job_role || ed.job_role,
    
        // Normalize readiness
        readiness:
          ed.overall_readiness === "ready"
            ? "Interview Ready"
            : ed.overall_readiness === "almost_ready"
            ? "Almost Ready"
            : "Needs More Practice",
    
        key_strength: ed.key_strength,
        main_weakness: ed.main_weakness,
        language_preference: ed.language_preference,
        candidate_sentiment: ed.candidate_sentiment,
    
        coaching_tips: [
          ed.coaching_tip_1,
          ed.coaching_tip_2
        ].filter(Boolean),
    
        call_completed: ed.call_completed,
      });
    }

    callResults.set(callSid, enriched);

    // update candidate
    for (const [id, candidate] of candidates.entries()) {
      if (candidate.current_call_sid === callSid) {
        candidate.last_result = enriched;
        candidate.status = "completed";
        candidates.set(id, candidate);
        break;
      }
    }

    console.log("✅ Call result stored for:", callSid);
  }

  send(res, 200, { ok: true });
});

// GET /api/results
route("GET", "/api/results", (req, res) => {
  const results = Array.from(callResults.values())
    .sort((a, b) => new Date(b.ended_at || b.scored_at) - new Date(a.ended_at || a.scored_at));
  send(res, 200, results);
});

// GET /api/results/:call_sid
routeDynamic("GET", "/api/results/:call_sid", (req, res, body, params) => {
  const result = callResults.get(params.call_sid);
  if (!result) return send(res, 404, { error: "Result not found" });
  send(res, 200, result);
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n✅ SkillBridge backend running → http://localhost:${PORT}`);
  console.log(`   POST /api/candidates      — add candidate`);
  console.log(`   GET  /api/candidates      — list candidates`);
  console.log(`   POST /api/trigger-call    — fire Bolna outbound call`);
  console.log(`   POST /api/score-interview — scoring endpoint (called by Bolna)`);
  console.log(`   POST /api/webhook         — Bolna posts results here`);
  console.log(`   GET  /api/results         — all call results`);
  console.log(`   GET  /api/stats           — dashboard stats\n`);
});

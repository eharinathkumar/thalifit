// ThaliFit — AI backend (Cloudflare Worker)
// Modes: parse (fast tier) · mealplan (smart tier) · plan + checkin (best tier)
// Provider-swappable: flip the PROVIDER constant below. API keys live in Worker
// secrets (ANTHROPIC_API_KEY / OPENAI_API_KEY / MOONSHOT_API_KEY) — never in client code.

const ALLOWED_ORIGINS = [
  "https://eharinathkumar.github.io", // PWA + TWA
  "https://localhost",                // Capacitor Android (default https scheme)
  "http://localhost",                 // Capacitor Android (http scheme)
  "capacitor://localhost",            // Capacitor iOS
];

// ============================================================
//  PROVIDER SWITCH — change this one line and redeploy.
//  "anthropic" | "openai" | "kimi"
// ============================================================
const PROVIDER = "anthropic";

// Tiers: fast = meal parsing (many calls/day) · smart = daily meal plan (1/day)
//        best = journey plan + weekly check-in (rare, high-stakes)
const PROVIDERS = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    keyName: "ANTHROPIC_API_KEY",
    style: "anthropic",
    models: { fast: "claude-haiku-4-5", smart: "claude-sonnet-4-6", best: "claude-fable-5" },
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    keyName: "OPENAI_API_KEY",
    style: "openai",
    models: { fast: "gpt-4o-mini", smart: "gpt-4o", best: "gpt-4o" },
  },
  kimi: {
    // Moonshot's OpenAI-compatible surface. Verify current model ids at platform.moonshot.ai
    // (the moonshot-v1-* and kimi-k2.5 families are being retired — do not use them).
    url: "https://api.moonshot.ai/v1/chat/completions",
    keyName: "MOONSHOT_API_KEY",
    style: "openai",
    // K2.6 on every tier ON PURPOSE. kimi-k3 always reasons (no way to disable it), which
    // for ThaliFit's small JSON calls meant ~24k reasoning chars, 2-3.5 minute latency, and
    // an empty answer once the token budget was spent thinking. K2.6 can run non-thinking.
    models: { fast: "kimi-k2.6", smart: "kimi-k2.6", best: "kimi-k2.6" },
    // Turns reasoning off — the whole budget goes to the answer. Remove this line (and raise
    // tokenMultiplier to ~5) if you ever want a thinking Kimi for the plan/check-in tier.
    extraBody: { thinking: { type: "disabled" } },
    tokenMultiplier: 4,
  },
};

const CFG = PROVIDERS[PROVIDER];
const MODEL_FAST = CFG.models.fast;
const MODEL_SMART = CFG.models.smart;
const MODEL_BEST = CFG.models.best;

// Some models emit raw newlines/control chars inside JSON string values, which is invalid
// JSON ("Unterminated string"). Escape them without touching the structure.
function repairJson(s) {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === "\\") { out += c; esc = true; continue; }
    if (c === '"') { inStr = !inStr; out += c; continue; }
    if (inStr) {
      const code = c.charCodeAt(0);
      if (c === "\n") { out += "\\n"; continue; }
      if (c === "\r") { out += "\\r"; continue; }
      if (c === "\t") { out += "\\t"; continue; }
      if (code < 0x20) { out += "\\u" + code.toString(16).padStart(4, "0"); continue; }
    }
    out += c;
  }
  return out;
}

// Non-Anthropic models sometimes wrap JSON in prose or fences. Salvage it.
function extractJson(text) {
  let t = String(text).replace(/```json|```/g, "").trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf("["), o = t.indexOf("{");
  let start = a === -1 ? o : o === -1 ? a : Math.min(a, o);
  if (start === -1) throw new Error("no JSON in reply: " + t.slice(0, 120));
  const close = t[start] === "[" ? "]" : "}";
  const end = t.lastIndexOf(close);
  if (end <= start) throw new Error("unbalanced JSON: " + t.slice(0, 120));
  const body = t.slice(start, end + 1);
  try { return JSON.parse(body); } catch {}
  return JSON.parse(repairJson(body));   // last resort: escape stray control chars
}

// Set by each request when the client passes {"debug":true}; collects token usage.
let LAST_USAGE = null;

async function askClaude(env, model, maxTokens, prompt) {
  const key = env[CFG.keyName];
  if (!key) throw new Error("missing Worker secret: " + CFG.keyName);
  const isAnthropic = CFG.style === "anthropic";

  const headers = isAnthropic
    ? { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }
    : { "content-type": "application/json", authorization: "Bearer " + key };

  const budget = Math.round(maxTokens * (CFG.tokenMultiplier || 1));

  const body = isAnthropic
    ? { model, max_tokens: budget, messages: [{ role: "user", content: prompt }] }
    : {
        model,
        max_tokens: budget,
        messages: [
          { role: "system", content: "You output only raw JSON. Never use markdown code fences. Never add commentary before or after the JSON." },
          { role: "user", content: prompt },
        ],
        ...(CFG.extraBody || {}),
      };

  // One retry on transient overload / rate limit
  let resp, attempt = 0;
  while (true) {
    resp = await fetch(CFG.url, { method: "POST", headers, body: JSON.stringify(body) });
    if (resp.status !== 429 || attempt >= 1) break;
    attempt++;
    await new Promise((r) => setTimeout(r, 2500));
  }
  if (!resp.ok) throw new Error(PROVIDER + " " + resp.status + " " + (await resp.text()).slice(0, 200));
  const data = await resp.json();

  let raw, why = "";
  if (isAnthropic) {
    raw = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    why = "stop_reason=" + (data.stop_reason || "?") + " · budget=" + budget;
  } else {
    const choice = (data.choices && data.choices[0]) || {};
    const msg = choice.message || {};
    raw = msg.content || "";
    why = [
      "finish_reason=" + (choice.finish_reason || "?"),
      "budget=" + budget,
      msg.reasoning_content ? "reasoning_content=" + String(msg.reasoning_content).length + " chars" : "no reasoning_content",
      data.usage ? "usage=" + JSON.stringify(data.usage) : "",
    ].filter(Boolean).join(" · ");
    if (!raw.trim()) throw new Error(PROVIDER + " returned empty content — " + why);
  }

  LAST_USAGE = {
    model,
    input_tokens: isAnthropic
      ? (data.usage && data.usage.input_tokens) || null
      : (data.usage && data.usage.prompt_tokens) || null,
    output_tokens: isAnthropic
      ? (data.usage && data.usage.output_tokens) || null
      : (data.usage && data.usage.completion_tokens) || null,
  };

  try {
    return extractJson(raw);
  } catch (e) {
    throw new Error(
      PROVIDER + " unparseable reply — " + why +
      " · replyChars=" + raw.length +
      " · tail=" + JSON.stringify(raw.slice(-90))
    );
  }
}

const DIET_RULES = {
  vegan: "vegan — NO animal products at all (no dairy, eggs, meat, fish, honey). Protein comes from legumes, beans, lentils, tofu, soy, nuts and plant protein powder, expressed through the user's chosen cuisines.",
  vegetarian: "vegetarian — dairy OK, but NO eggs, meat, or fish. Protein comes from dairy, legumes, beans, lentils and soy, expressed through the user's chosen cuisines.",
  eggitarian: "vegetarian plus eggs — dairy and eggs OK, NO meat or fish.",
  whitemeat: "white meat only — chicken, turkey, fish, seafood, eggs, and dairy OK. NO red meat (no lamb, beef, pork, goat).",
  meat: "meat eater — everything OK including poultry, fish, eggs and red meat.",
};
const dietRules = (d) => DIET_RULES[d] || DIET_RULES.vegetarian;

// Food-and-habit guidance only. Never medication, dosing, or clinical targets.
const CONDITION_RULES = {
  diabetes_t1:
    "Type 1 diabetes: keep carbohydrate amounts consistent and predictable at each meal, pair carbs with protein/fat/fibre, and prefer lower-glycaemic versions of whatever starch their cuisine uses.",
  diabetes_t2:
    "Type 2 diabetes: lower the overall glycaemic load, spread carbohydrates evenly across meals rather than one large starch-heavy meal, emphasise fibre, legumes, vegetables and protein, and limit sweets, sugary drinks and refined flour.",
  prediabetes:
    "Prediabetes: moderate refined carbohydrates and sugar, emphasise fibre, whole grains, protein at every meal, and a short walk after meals.",
  bp:
    "High blood pressure: keep sodium modest — limit salty preserved foods, packaged snacks and restaurant meals; emphasise potassium-rich vegetables, fruit and whole foods.",
  cholesterol:
    "High cholesterol: limit deep-fried foods and heavy saturated fats (full-fat dairy, butter/ghee-style cooking fats); emphasise soluble fibre, vegetables, nuts in moderation and unsaturated fats.",
  pcos:
    "PCOS: lower glycaemic load, adequate protein at each meal, emphasise fibre and healthy fats, keep refined sugar occasional.",
  thyroid:
    "Thyroid condition: normal balanced eating with adequate protein and iodine from regular diet; nothing exotic or restrictive.",
};
function avoidText(allergies, dislikes) {
  let out = "";
  const a = (allergies || "").trim();
  const d = (dislikes || "").trim();
  if (a) out += `\nALLERGIES — ABSOLUTE HARD RULE: the user is allergic to: ${a}. NEVER suggest any dish that contains these, in any form, as an ingredient, garnish, or cooking base. This overrides every other preference. If a normally-suitable dish would contain an allergen, choose a different dish. Double-check every item before including it.`;
  if (d) out += `\nDISLIKES: the user dislikes: ${d}. Do not suggest dishes built around these. Minor incidental use is acceptable only if unavoidable, but prefer alternatives.`;
  return out;
}
function conditionText(list) {
  const arr = Array.isArray(list) ? list.filter((c) => CONDITION_RULES[c]) : [];
  if (!arr.length) return "";
  return (
    "\nHealth considerations reported by the user (adjust FOOD CHOICES only): " +
    arr.map((c) => CONDITION_RULES[c]).join(" ") +
    "\nApply these as NUTRITIONAL PRINCIPLES ONLY — express them using foods from the user's chosen cuisines. Never switch cuisines because of a health condition." +
    "\nCRITICAL SAFETY RULES: You are a food and habit coach, NOT a clinician. NEVER mention, suggest, or adjust medication, insulin, dosing, supplements-as-treatment, blood sugar targets, blood pressure numbers, or any clinical measure. NEVER tell them to change anything their doctor prescribed. Keep all advice to food choices, portions, meal timing and movement."
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Adds token usage to responses when the client sends {"debug":true}
    const withMeta = (obj, debug) =>
      debug && LAST_USAGE ? { ...obj, _meta: { provider: PROVIDER, ...LAST_USAGE } } : obj;

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: cors });
    if (!allowed)
      return new Response(JSON.stringify({ error: "Forbidden", detail: "origin: " + origin }), { status: 403, headers: cors });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: cors });
    }

    // Diagnostic: POST {"type":"whoami"} -> which provider/models are live
    if (body.type === "whoami") {
      return new Response(
        JSON.stringify({ provider: PROVIDER, url: CFG.url, models: CFG.models, keyPresent: !!env[CFG.keyName] }),
        { headers: cors }
      );
    }

    // ============ MODE: EXERCISE MET LOOKUP (cardio not in the local index) ============
    if (body.type === "exercise_met") {
      const name = String(body.name || "").slice(0, 60);
      if (!name) return new Response(JSON.stringify({ error: "no name" }), { status: 400, headers: cors });
      const prompt = `You are a fitness reference. For the physical activity "${name}", return its typical MET (metabolic equivalent) value for a moderate effort level, using the Compendium of Physical Activities as reference.
Return ONLY raw JSON, no markdown: {"name":"<cleaned-up activity name>","met":<number between 1 and 20>}
If "${name}" is not a real physical activity, return {"name":"${name}","met":0}.`;
      try {
        const out = await askClaude(env, MODEL_FAST, 120, prompt);
        const met = Number(out.met) || 0;
        if (!met || met < 1) return new Response(JSON.stringify({ error: "not an activity" }), { status: 404, headers: cors });
        return new Response(JSON.stringify(withMeta({ name: out.name || name, met: Math.min(20, met) }, body.debug)), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: "lookup failed", detail: String(e).slice(0, 160) }), { status: 500, headers: cors });
      }
    }

    // ============ MODE: JOURNEY PLAN (once, at setup or re-plan) ============
    if (body.type === "plan" && body.profile) {
      const p = body.profile;
      const hasGoalWeight = p.goal_weight_kg && p.goal !== "maintain";
      const delta = hasGoalWeight ? Math.round((p.weight_kg - p.goal_weight_kg) * 10) / 10 : 0;

      const prompt = `You are a steady, encouraging nutrition coach inside a food-tracking app. Build ONE clear plan this person can follow for weeks. This plan is stored and shown every day, so it must be consistent, specific and realistic — not generic advice.

PERSON
Name: ${p.name || "there"}
Age ${p.age}, sex ${p.sex}, height ${p.height_cm} cm, current weight ${p.weight_kg} kg, BMI ${p.bmi}
Activity outside workouts: ${p.activity}. Average daily steps: ${p.avg_daily_steps}
Diet: ${dietRules(p.diet)}
Favourite cuisines: ${(Array.isArray(p.cuisines) && p.cuisines.length ? p.cuisines : ["Indian"]).join(", ")}${(Array.isArray(p.cuisines) && p.cuisines.includes("Indian") && p.indian_style) ? " (Indian leaning: " + p.indian_style + ")" : ""}
Goal: ${p.goal}${hasGoalWeight ? ", target weight " + p.goal_weight_kg + " kg (" + (delta > 0 ? delta + " kg to lose" : Math.abs(delta) + " kg to gain") + ")" : ""}${conditionText(p.conditions)}${avoidText(p.allergies, p.dislikes)}

RULES
- Compute targets with Mifflin-St Jeor BMR × activity multiplier, using steps as an extra signal.
- The DIRECTION comes from the target weight, not the goal label. If the goal is "build muscle" but the target weight is BELOW current weight, this is body recomposition: calories at maintenance or a slight deficit (100-250), protein high (1.8-2.2 g/kg), weekly_rate_kg small and NEGATIVE (-0.1 to -0.25). Never a calorie surplus when the target is below current weight.
- Weight loss: deficit 300-500 cal/day. NEVER below 1400 calories/day. weekly_rate_kg between 0.25 and 0.5 (negative number).
- Muscle gain with target ABOVE current weight: small surplus, protein 1.6-2.0 g/kg. weekly_rate_kg between 0.1 and 0.25 (positive).
- Maintain: weekly_rate_kg = 0.
- The user uses ${p.units === "imperial" ? "POUNDS — express every weight you mention in the summary and habits in lb (convert from kg; 1 kg = 2.2 lb)" : "kilograms — express weights in kg"}. The weekly_rate_kg field itself stays in kg regardless.
- Recommend the pace YOU think fits their situation, and say why in one line of the summary.
- "habits" must be 3-5 SPECIFIC, repeatable daily/weekly actions — not platitudes like "eat healthy". Each habit must name real foods or portions.
- CRITICAL: every food you name must come from the cuisines listed above. Do NOT mention Indian foods (dal, sambar, roti, rice, paneer, dosa, etc.) unless "Indian" appears in their cuisine list. If they listed Korean and Mediterranean, use Korean and Mediterranean foods (e.g. kimchi, tofu, grilled fish, chickpeas, olive oil, Greek yogurt) — this is a hard requirement, not a preference.
- Habits should suit their diet restrictions as well.
- summary: 2-3 sentences, address them by name, explain the number and the pace plainly.
- If health considerations were listed, "medical_note" must be one short sentence reminding them their doctor or dietitian sets the medical plan and this app only helps with food choices. Otherwise medical_note = "".
- "coach_notes": a 3-4 sentence private profile of this person for your own future coaching — their situation, the challenges they will most likely hit, and what coaching approach fits them. Third person, specific, no fluff.
- Even if the inputs seem unusual or contradictory, NEVER reply with prose or questions — always return the JSON, resolving conflicts in favour of the listed cuisines.
- Respond with ONLY raw JSON, no markdown fences:
{"daily_calories":<int>,"protein_g":<int>,"weekly_rate_kg":<number>,"summary":"...","habits":["...","...","..."],"medical_note":"...","coach_notes":"..."}`;

      try {
        const plan = await askClaude(env, MODEL_BEST, 1200, prompt);
        plan.daily_calories = Math.max(1400, Math.round(Number(plan.daily_calories) || 0));
        plan.protein_g = Math.max(40, Math.round(Number(plan.protein_g) || 0));
        let rate = Number(plan.weekly_rate_kg) || 0;
        const targetBelow = hasGoalWeight && p.goal_weight_kg < p.weight_kg;
        if (p.goal === "lose") rate = -Math.min(0.5, Math.max(0.25, Math.abs(rate)));
        else if (p.goal === "build" && targetBelow) rate = -Math.min(0.25, Math.max(0.1, Math.abs(rate))); // recomposition
        else if (p.goal === "build") rate = Math.min(0.25, Math.max(0.1, Math.abs(rate)));
        else rate = 0;
        plan.weekly_rate_kg = Math.round(rate * 100) / 100;
        plan.summary = String(plan.summary || "").slice(0, 400);
        plan.habits = (plan.habits || []).slice(0, 5).map((h) => String(h).slice(0, 160));
        plan.medical_note = String(plan.medical_note || "").slice(0, 240);
        plan.coach_notes = String(plan.coach_notes || "").slice(0, 600);
        return new Response(JSON.stringify(withMeta({ plan }, body.debug)), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Plan generation failed", detail: String(e).slice(0, 200) }), {
          status: 500,
          headers: cors,
        });
      }
    }

    // ============ MODE: WEEKLY CHECK-IN ============
    if (body.type === "checkin" && body.progress) {
      const g = body.progress;
      const prompt = `You are the same steady nutrition coach, doing a WEEKLY CHECK-IN. Be warm, brief and concrete. Never shame.

PERSON: ${g.name || "there"}
Goal: ${g.goal}${g.goal_weight_kg ? ", target " + g.goal_weight_kg + " kg" : ""}
Current plan: ${g.calorie_target} cal/day, ${g.protein_target}g protein, planned pace ${g.weekly_rate_kg} kg/week
Their habits: ${(g.habits || []).join(" | ") || "(none set)"}
COACH NOTES — what you know about this person from previous sessions (use this to personalize your message): ${g.coach_notes || "(first check-in, no notes yet)"}
Diet: ${dietRules(g.diet)}${conditionText(g.conditions)}${avoidText(g.allergies, g.dislikes)}

PROGRESS
Weeks on plan: ${g.weeks_elapsed}
Starting weight: ${g.start_weight_kg} kg -> latest weight: ${g.current_weight_kg} kg (change ${Math.round((g.current_weight_kg - g.start_weight_kg) * 10) / 10} kg)
Change over the last 2 weeks: ${g.recent_change_kg != null ? g.recent_change_kg + " kg" : "not enough weigh-ins"}
Days logged in the last 7: ${g.days_logged_week}
Average calories on logged days: ${g.avg_calories || "unknown"}
Average protein on logged days: ${g.avg_protein || "unknown"}g

RULES
- status must be one of: ahead, on_track, behind, stalled, no_data.
- If they are losing FASTER than 0.75 kg/week, that is too fast — treat as "ahead" and suggest eating slightly more, not less.
- Only adjust targets when the evidence supports it. Small changes only: at most +/-150 calories. NEVER below 1400 calories/day. If no change is needed, set adjusted_calories and adjusted_protein to null.
- If days_logged_week is under 4, the main issue is logging consistency, not the diet — say so kindly.
- message: 2-3 sentences, address them by name, state what the data shows and the single most useful next step. ${g.units === "imperial" ? "Express any weights you mention in POUNDS (1 kg = 2.2 lb)." : "Express weights in kg."}
- focus_habit: pick ONE of their existing habits to emphasise this week, or write a new specific one.
- updated_coach_notes: REVISE the coach notes with anything meaningful this week taught you about them (patterns, what worked, what did not). Correct anything that proved wrong. Keep it under 90 words — prune stale observations rather than only appending. Third person.
- Respond with ONLY raw JSON, no markdown fences:
{"status":"...","message":"...","adjusted_calories":<int or null>,"adjusted_protein":<int or null>,"focus_habit":"...","updated_coach_notes":"..."}`;

      try {
        const c = await askClaude(env, MODEL_BEST, 700, prompt);
        const VALID = ["ahead", "on_track", "behind", "stalled", "no_data"];
        c.status = VALID.includes(c.status) ? c.status : "on_track";
        c.message = String(c.message || "").slice(0, 400);
        c.focus_habit = String(c.focus_habit || "").slice(0, 160);
        c.adjusted_calories =
          c.adjusted_calories == null ? null : Math.max(1400, Math.round(Number(c.adjusted_calories) || 0));
        c.adjusted_protein =
          c.adjusted_protein == null ? null : Math.max(40, Math.round(Number(c.adjusted_protein) || 0));
        c.updated_coach_notes = String(c.updated_coach_notes || "").slice(0, 700);
        return new Response(JSON.stringify(withMeta({ checkin: c }, body.debug)), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Check-in failed", detail: String(e).slice(0, 200) }), {
          status: 500,
          headers: cors,
        });
      }
    }

    // ============ MODE: DAILY MEAL PLAN (execution only) ============
    if (body.type === "mealplan" && body.profile) {
      const p = body.profile;
      const avoid = (Array.isArray(p.avoid) ? p.avoid : []).slice(0, 40).map(String).join("; ");
      // What's already been eaten today — plan only the remainder.
      const eatenCal = Math.max(0, Math.round(Number(p.eaten_calories) || 0));
      const eatenPro = Math.max(0, Math.round(Number(p.eaten_protein) || 0));
      const usedSlots = Array.isArray(p.logged_slots) ? p.logged_slots.filter((s) => ["Morning", "Afternoon", "Evening", "Other"].includes(s)) : [];
      const remainingCal = Math.max(0, (p.calorie_target || 0) - eatenCal);
      const remainingPro = Math.max(0, (p.protein_target || 0) - eatenPro);
      const openSlots = ["Morning", "Afternoon", "Evening", "Other"].filter((s) => !usedSlots.includes(s));
      const overBudget = eatenCal > 0 && remainingCal < 150; // essentially no room left

      const alreadyLine = eatenCal > 0
        ? `\nALREADY EATEN TODAY: ${eatenCal} calories, ${eatenPro}g protein${usedSlots.length ? " (logged in: " + usedSlots.join(", ") + ")" : ""}. Plan ONLY these remaining meal slots: ${openSlots.join(", ") || "none"}. The dishes you suggest must add up to about the REMAINING budget below, NOT the full daily target.`
        : "\nNothing has been logged yet today — plan the full day (Morning, Afternoon, Evening, plus an optional Other snack).";

      const budgetLine = eatenCal > 0
        ? `Remaining budget to plan for: ${remainingCal} calories, ${remainingPro}g protein`
        : `Daily targets: ${p.calorie_target} calories, ${p.protein_target}g protein`;

      const overLine = overBudget
        ? `\nIMPORTANT: They have essentially met or exceeded today's calories already. Do NOT prescribe more meals. Return a plan array with a single "Other" entry whose only item is a gentle, near-zero-calorie suggestion (e.g. water, herbal tea, or a small piece of fruit if they're hungry), and make the note reassuring — today's eating is done.`
        : "";

      const prompt = `You are the meal-planning engine of a food-tracking app. Your ONLY job is to output today's dishes. Do NOT give lifestyle advice, motivation, or new habits — the user already has a plan; you are executing it.
${alreadyLine}${overLine}

PLAN TO EXECUTE (do not change it)
${budgetLine}
Their standing habits (respect these when choosing dishes): ${(p.habits || []).join(" | ") || "(none)"}
Diet: ${dietRules(p.diet)}
Favourite cuisines: ${(Array.isArray(p.cuisines) && p.cuisines.length ? p.cuisines : ["Indian"]).join(", ")}${(p.cuisines || ["Indian"]).includes("Indian") ? " — Indian leaning: " + (p.indian_style === "north" ? "North Indian" : p.indian_style === "south" ? "South Indian" : "mix North and South") : ""}${conditionText(p.conditions)}${avoidText(p.allergies, p.dislikes)}
Variety seed: ${p.seed}

RULES
- Structure: output ONLY these meal slots: ${(eatenCal > 0 ? openSlots : ["Morning","Afternoon","Evening","Other"]).join(", ") || "Other"} (2-4 items each; "Other" is an optional snack). Do NOT include any slot the user has already logged.
- The dishes across the slots you output should TOTAL about ${eatenCal > 0 ? remainingCal : p.calorie_target} calories (within ~10%) and aim for ${eatenCal > 0 ? remainingPro : Math.max(0, (p.protein_target || 0) - 10)}g protein or more.
- Only include an "Other" snack slot if there is meaningful calorie room left for it.
- Strictly obey the diet rules and any health considerations above.
- Real, practical dishes with clear portions, drawn ONLY from the cuisines listed above. If Indian is not listed, do not output Indian dishes at all.
- Do NOT repeat these recently suggested items: ${avoid || "(none yet)"}.
- "note" is ONE short sentence naming the theme of today's food only (e.g. "South Indian day, protein spread across all three meals").
- Respond with ONLY raw JSON, no markdown fences:
{"note":"...","plan":[{"meal":"Morning","items":[{"name":"...","calories":<int>,"protein_g":<int>}]},{"meal":"Afternoon","items":[...]},{"meal":"Evening","items":[...]},{"meal":"Other","items":[...]}]}`;

      try {
        const mp = await askClaude(env, MODEL_SMART, 1400, prompt);
        const VALID = ["Morning", "Afternoon", "Evening", "Other"];
        mp.note = String(mp.note || "").slice(0, 200);
        mp.plan = (mp.plan || [])
          .filter((m) => m && VALID.includes(m.meal) && Array.isArray(m.items) && m.items.length)
          .slice(0, 4)
          .map((m) => ({
            meal: m.meal,
            items: m.items.slice(0, 5).map((i) => ({
              name: String(i.name || "").slice(0, 120),
              calories: Math.max(0, Math.round(Number(i.calories) || 0)),
              protein_g: Math.max(0, Math.round(Number(i.protein_g) || 0)),
            })),
          }));
        if (!mp.plan.length) throw new Error("empty plan");
        return new Response(JSON.stringify(withMeta({ mealplan: mp }, body.debug)), { headers: cors });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Meal plan failed", detail: String(e).slice(0, 200) }), {
          status: 500,
          headers: cors,
        });
      }
    }

    // ============ MODE: MEAL PARSING (default, fast model) ============
    const text = String(body.text || "").slice(0, 500);
    if (!text.trim())
      return new Response(JSON.stringify({ error: "Empty text" }), { status: 400, headers: cors });

    const prompt = `You are a nutrition parser for a calorie-tracking app used by an Indian-American household. Parse this meal description into food items with estimated nutrition.

Meal description: "${text}"

Rules:
- First decide: is this SEVERAL dishes, or ONE dish described by its ingredients?
  * Several dishes ("2 dosas with podi and coffee") -> separate items, one per dish.
  * One dish with ingredients listed ("omelette with 2 eggs, 2 egg whites and onions") -> return a SINGLE combined item (e.g. "Omelette (2 eggs, 2 whites, onions)") with totals for the whole dish. Do NOT itemize ingredients of a single dish.
- Include realistic cooking fat (oil/butter/ghee) in any cooked dish's totals — an omelette, curry, or stir-fry is not made dry.
- Use typical serving sizes; respect quantities the user states.
- For drinks, smoothies, shakes, juices, coffee and tea: express the portion in fluid ounces or cups (e.g. "Mango smoothie (16 oz)"), NEVER in grams.
- Assume Indian preparation where ambiguous (coffee = filter coffee with milk & sugar, tea = chai).
- All numbers must be integers for the TOTAL quantity stated (2 dosas = values for 2).
- Respond with ONLY a raw JSON array, no markdown fences, no prose:
[{"name":"<item with quantity, e.g. '2 dosas'>","calories":<int>,"protein_g":<int>,"carbs_g":<int>,"fat_g":<int>}]`;

    try {
      let items = await askClaude(env, MODEL_FAST, 800, prompt);
      if (!Array.isArray(items)) throw new Error("not an array");
      items = items
        .filter((i) => i && typeof i.name === "string")
        .slice(0, 15)
        .map((i) => ({
          name: i.name.slice(0, 120),
          calories: Math.max(0, Math.round(Number(i.calories) || 0)),
          protein_g: Math.max(0, Math.round(Number(i.protein_g) || 0)),
          carbs_g: Math.max(0, Math.round(Number(i.carbs_g) || 0)),
          fat_g: Math.max(0, Math.round(Number(i.fat_g) || 0)),
        }));
      return new Response(JSON.stringify(withMeta({ items }, body.debug)), { headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Could not parse meal", detail: String(e).slice(0, 200) }), {
        status: 500,
        headers: cors,
      });
    }
  },
};

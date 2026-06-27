import Fuse from "fuse.js";
import type { Protocol, SearchResult } from "./types";

// ── Normalización ─────────────────────────────────────────────────────────────

function normalize(input: string): string {
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const STOP = new Set([
    "y","o","el","la","los","las","de","del","que","un","una","me","se","al","por",
    "para","con","sin","no","esta","es","son","su","sus","lo","como","en","a","ha",
    "hay","si","te","tu","mi","le","les",
]);

function stem(t: string): string {
    for (const s of ["mente","aciones","acion","imiento","imientos","ando","iendo","ado","ido","ar","er","ir","es","s"]) {
        if (t.length > s.length + 3 && t.endsWith(s)) return t.slice(0, -s.length);
    }
    return t;
}

function tokenize(input: string): string[] {
    return [...new Set(
        normalize(input).split(" ").filter(Boolean)
            .filter(t => !STOP.has(t))
            .map(stem)
    )];
}

// ── Motor de sinónimos ────────────────────────────────────────────────────────

const SYNONYMS: Record<string, string> = {
    "desmayo":           "inconsciente",
    "desmayado":         "inconsciente",
    "no despierta":      "inconsciente",
    "no responde":       "inconsciente",
    "sin reaccion":      "inconsciente",
    "se puso morado":    "no respira",
    "morado":            "no respira",
    "azulado":           "no respira",
    "ahogando":          "atragantamiento",
    "atragantado":       "atragantamiento",
    "no puede hablar":   "atragantamiento",
    "ataque al corazon": "paro cardiaco",
    "infarto":           "paro cardiaco",
    "dolor pecho":       "dolor pecho",
    "me queme":          "quemadura",
    "me quemé":          "quemadura",
    "aceite caliente":   "quemadura",
    "aceite hirviendo":  "quemadura",
    "bajón de azúcar":   "hipoglucemia",
    "bajon de azucar":   "hipoglucemia",
    "azúcar baja":       "hipoglucemia",
    "crisis epileptica": "convulsiones",
    "ataque epileptico": "convulsiones",
    "reaccion alergica": "anafilaxia",
    "alergia grave":     "anafilaxia",
    "no para de sangrar":"sangrado",
    "hemorragia":        "sangrado",
};

function expand(tokens: string[], original: string): string[] {
    const out = new Set<string>(tokens.map(normalize));
    const norm = normalize(original);
    for (const [variant, canonical] of Object.entries(SYNONYMS)) {
        const vn = normalize(variant);
        if (norm.includes(vn) || tokens.some(t => vn.includes(t) || t.includes(vn))) {
            normalize(canonical).split(" ").forEach(w => out.add(w));
        }
    }
    return [...out];
}

// ── Motor de búsqueda ─────────────────────────────────────────────────────────

const FUSE_OPTIONS = {
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    keys: [
        { name: "title",    weight: 0.4 },
        { name: "keywords", weight: 0.35 },
        { name: "symptoms", weight: 0.25 },
    ],
};

const W = {
    fuse:             0.6,
    exactTitle:       0.8,
    priorityKeyword:  0.6,
    symptom:          0.35,
    emergencyTrigger: 1.2,
    criticalBoost:    0.8,
    alias:            0.2,
    keyword:          0.1,
};

function countMatches(tokens: string[], targets: string[] | undefined): number {
    if (!targets?.length) return 0;
    let n = 0;
    for (const t of targets) {
        const nt = normalize(t);
        if (tokens.some(tok => nt.includes(tok) || tok.includes(nt))) n++;
    }
    return n;
}

export function searchProtocols(query: string, protocols: Protocol[]): SearchResult[] {
    const q = query.trim();
    if (q.length < 2) return [];

    const tokens  = tokenize(q);
    const expanded = expand(tokens, q);
    const qnorm   = normalize(q);

    // Fuse base search
    const fuse    = new Fuse(protocols, FUSE_OPTIONS);
    const fuseMap = new Map<string, number>();
    for (const r of fuse.search(q)) fuseMap.set(r.item.id, 1 - (r.score ?? 0));

    const results: SearchResult[] = [];

    for (const proto of protocols) {
        const base        = fuseMap.get(proto.id) ?? 0;
        const symptomM    = countMatches(expanded, proto.symptoms);
        const keywordM    = countMatches(expanded, proto.keywords);
        const priorityM   = countMatches(expanded, proto.priorityKeywords);
        const aliasM      = countMatches(expanded, proto.aliases);
        const exactTitle  = normalize(proto.title);
        const titleMatch  = qnorm.includes(exactTitle) || exactTitle.includes(qnorm) ? 1 : 0;

        let emergencyM = 0;
        for (const t of (proto.emergencyTriggers ?? [])) {
            const nt = normalize(t);
            if (expanded.some(e => nt.includes(e) || e.includes(nt))) emergencyM++;
        }

        if (base === 0 && symptomM === 0 && priorityM === 0 && emergencyM === 0 && aliasM === 0 && keywordM === 0) continue;

        let score = 0;
        score += W.fuse             * base;
        score += W.priorityKeyword  * Math.min(1, priorityM);
        score += W.symptom          * Math.min(1, symptomM / 2);
        score += W.emergencyTrigger * Math.min(1, emergencyM);
        score += W.exactTitle       * titleMatch;
        score += W.criticalBoost    * (proto.severity === "critical" ? 1 : 0);
        score += W.alias            * (aliasM > 0 ? 1 : 0);
        score += W.keyword          * Math.min(5, keywordM);

        results.push({ protocol: proto, score: Math.min(2, score) });
    }

    return results.sort((a, b) => b.score - a.score);
}

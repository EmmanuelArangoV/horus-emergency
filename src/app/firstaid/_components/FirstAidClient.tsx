"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Protocol, SearchResult } from "@/lib/firstaid/types";
import { PROTOCOLS } from "@/lib/firstaid/protocols";
import { searchProtocols } from "@/lib/firstaid/search";
import StepTimer from "./StepTimer";
import DecisionTree from "./DecisionTree";

// ── Colores por severidad ─────────────────────────────────────────────────────
const SEV = {
    critical: { badge: "#C0392B", badgeText: "#fff", label: "CRÍTICO",  border: "#C0392B33", bg: "#FEE2E2", text: "#7F1D1D" },
    urgent:   { badge: "#E67E22", badgeText: "#fff", label: "URGENTE",  border: "#E67E2233", bg: "#FEF3C7", text: "#7C3A00" },
    mild:     { badge: "#27AE60", badgeText: "#fff", label: "LEVE",     border: "#27AE6033", bg: "#F0FDF4", text: "#1A3D0A" },
};

const CATEGORIES = [
    { id: "cardiac",      label: "Cardíaco",    icon: "♥" },
    { id: "respiratory",  label: "Respiratorio", icon: "~" },
    { id: "neurological", label: "Neurológico",  icon: "⚡" },
    { id: "trauma",       label: "Trauma",       icon: "+" },
    { id: "allergic",     label: "Alérgico",     icon: "⚠" },
    { id: "poisoning",    label: "Intoxicación", icon: "✕" },
    { id: "other",        label: "Otros",        icon: "↗" },
];

// ── Floating dialog modal ─────────────────────────────────────────────────────
function ProtocolModal({ protocol, onClose }: { protocol: Protocol; onClose: () => void }) {
    const sev = SEV[protocol.severity];
    const [activeTab, setActiveTab] = useState<"steps" | "tree">("steps");
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);

    function handleClose() {
        setVisible(false);
        setTimeout(onClose, 250);
    }

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
            style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: visible ? "rgba(26,21,18,0.5)" : "rgba(26,21,18,0)",
                transition: "background 0.25s ease",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 16,
            }}
        >
            <div style={{
                background: "var(--bg)",
                borderRadius: 20,
                width: "100%", maxWidth: 520,
                maxHeight: "88vh",
                overflow: "hidden",
                transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(20px)",
                opacity: visible ? 1 : 0,
                transition: "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease",
                boxShadow: "0 24px 60px rgba(26,21,18,0.25), 0 4px 16px rgba(26,21,18,0.1)",
            }}>
            <div className="modal-scroll" style={{ overflowY: "auto", maxHeight: "88vh", paddingBottom: 28 }}>
                <div style={{ height: 8 }} />

                {/* Header */}
                <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6, background: sev.badge, color: sev.badgeText, letterSpacing: "0.07em" }}>
                            {sev.label}
                        </span>
                        {protocol.callEmergency && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#C0392B", background: "#FEE2E2", padding: "3px 8px", borderRadius: 6, border: "1px solid #C0392B33" }}>
                                Llama al 123
                            </span>
                        )}
                        {protocol.estimatedTime && (
                            <span style={{ fontSize: 11, color: "#8C7F6E", fontWeight: 500 }}>~{protocol.estimatedTime} min</span>
                        )}
                        <button onClick={handleClose} style={{ marginLeft: "auto", background: "#F3EFE7", border: "1px solid #E8E2D8", borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "#8C7F6E", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#1A1512", margin: 0, letterSpacing: "-0.3px" }}>
                        {protocol.title}
                    </h2>
                </div>

                <div style={{ padding: "16px 20px" }}>
                    {/* Advertencias */}
                    {protocol.warnings.length > 0 && (
                        <div style={{ background: sev.bg, border: `1px solid ${sev.badge}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: sev.text, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>⚠ Advertencias</div>
                            {protocol.warnings.map((w, i) => (
                                <p key={i} style={{ fontSize: 12, color: sev.text, fontWeight: 500, margin: "0 0 3px", lineHeight: 1.5 }}>• {w}</p>
                            ))}
                        </div>
                    )}

                    {/* Tabs — solo si hay árbol */}
                    {protocol.decisionTree && (
                        <div style={{ display: "flex", gap: 3, marginBottom: 16, background: "#F3EFE7", borderRadius: 10, padding: 3 }}>
                            {(["steps", "tree"] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                                    flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                                    fontSize: 12, fontWeight: 700,
                                    background: activeTab === tab ? "#fff" : "transparent",
                                    color: activeTab === tab ? "#1A1512" : "#8C7F6E",
                                    boxShadow: activeTab === tab ? "0 1px 3px rgba(26,21,18,0.1)" : "none",
                                    transition: "all 0.15s",
                                }}>
                                    {tab === "steps" ? "Pasos" : "Evaluación guiada"}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Pasos */}
                    {activeTab === "steps" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {protocol.steps.map((step, i) => (
                                <div key={step.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", border: "1px solid #E8E2D8" }}>
                                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#1A1512", color: "#F9F6ED", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1512", margin: 0, lineHeight: 1.5 }}>{step.instruction}</p>
                                            {step.warning && (
                                                <p style={{ fontSize: 11, fontWeight: 600, color: "#C0392B", margin: "5px 0 0" }}>⚠ {step.warning}</p>
                                            )}
                                            {step.duration && <StepTimer duration={step.duration} />}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Árbol de decisión */}
                    {activeTab === "tree" && protocol.decisionTree && (
                        <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #E8E2D8" }}>
                            <DecisionTree nodes={protocol.decisionTree} />
                        </div>
                    )}

                    {/* Llamar 123 */}
                    {protocol.callEmergency && (
                        <a href="tel:123" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, background: "#C0392B", color: "#fff", borderRadius: 14, padding: "15px 20px", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.92a16 16 0 0 0 6.1 6.1l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                            Llamar al 123 ahora
                        </a>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
}

// ── Tarjeta de protocolo ──────────────────────────────────────────────────────
function ProtocolCard({ protocol, onClick }: { protocol: Protocol; onClick: () => void }) {
    const sev = SEV[protocol.severity];
    return (
        <button onClick={onClick} style={{
            width: "100%", textAlign: "left",
            background: "#fff", borderRadius: 14, padding: "13px 16px",
            border: `1.5px solid ${sev.border}`,
            cursor: "pointer", display: "block",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: sev.badge, color: sev.badgeText, letterSpacing: "0.07em" }}>{sev.label}</span>
                {protocol.callEmergency && <span style={{ fontSize: 9, color: "#C0392B", fontWeight: 600 }}>· 123</span>}
                {protocol.decisionTree && <span style={{ fontSize: 9, color: "#27AE60", fontWeight: 600 }}>· Evaluación guiada</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: "#1A1512", margin: 0, letterSpacing: "-0.2px" }}>{protocol.title}</p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4BDB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <p style={{ fontSize: 11, color: "#8C7F6E", margin: "2px 0 0" }}>{protocol.steps.length} pasos{protocol.estimatedTime ? ` · ~${protocol.estimatedTime} min` : ""}</p>
        </button>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface Props {
    suggestedIds: string[];
    patientName?: string;
    userId?: string;
}

export default function FirstAidClient({ suggestedIds, patientName, userId }: Props) {
    const router = useRouter();
    const [query,    setQuery]    = useState("");
    const [results,  setResults]  = useState<SearchResult[]>([]);
    const [selected, setSelected] = useState<Protocol | null>(null);
    const [category, setCategory] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const suggested = PROTOCOLS.filter(p => suggestedIds.includes(p.id));
    const rest       = PROTOCOLS.filter(p => !suggestedIds.includes(p.id));

    const doSearch = useCallback((q: string, cat: string | null) => {
        if (cat) { setResults(PROTOCOLS.filter(p => p.category === cat).map(p => ({ protocol: p, score: 1 }))); return; }
        if (q.length < 2) { setResults([]); return; }
        setResults(searchProtocols(q, PROTOCOLS));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => doSearch(query, category), 250);
        return () => clearTimeout(t);
    }, [query, category, doSearch]);

    const showSuggested  = !query && !category && suggested.length > 0;
    const showAll        = !query && !category && suggested.length === 0;
    const showResults    = !!(query || category);
    const displayResults = results.slice(0, 10);

    function goBack() {
        if (userId) router.push(`/emergency/${userId}`);
        else router.back();
    }

    return (
        <div style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: "var(--bg)", color: "var(--primary)", minHeight: "100vh", maxWidth: 600, margin: "0 auto" }}>

            {/* ── Top compact ─────────────────────────────── */}
            <div style={{ padding: "16px 16px 0" }}>
                {/* Botón volver */}
                <button onClick={goBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#8C7F6E", fontSize: 12, fontWeight: 700, padding: "4px 0", marginBottom: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    {patientName ? `Ficha de ${patientName}` : "Volver a la ficha"}
                </button>

                {/* Título pequeño */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, background: "#1A1512", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FAD957" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1512", letterSpacing: "-0.2px", lineHeight: 1 }}>HORUS AID</div>
                        <div style={{ fontSize: 10, color: "#8C7F6E", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Primeros auxilios</div>
                    </div>
                </div>

                {/* Buscador */}
                <div style={{ background: "#fff", borderRadius: 14, padding: "0 14px", display: "flex", alignItems: "center", gap: 10, border: "1.5px solid #E8E2D8", marginBottom: 16 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8C7F6E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="¿Qué está pasando? ej: convulsión, no respira…"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setCategory(null); }}
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "#1A1512", padding: "13px 0", fontFamily: "'DM Sans', sans-serif" }}
                    />
                    {query && (
                        <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#8C7F6E", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
                    )}
                </div>
            </div>

            {/* ── Contenido ───────────────────────────────── */}
            <div style={{ padding: "0 16px 48px" }}>

                {/* Filtros de categoría */}
                {!query && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => setCategory(c => c === cat.id ? null : cat.id)} style={{
                                padding: "6px 12px", borderRadius: 99,
                                border: `1.5px solid ${category === cat.id ? "#1A1512" : "#E8E2D8"}`,
                                background: category === cat.id ? "#1A1512" : "#fff",
                                color: category === cat.id ? "#F9F6ED" : "#1A1512",
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sugerencias para el paciente */}
                {showSuggested && (
                    <>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#C0392B", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                            ⚡ Relevante para este paciente
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                            {suggested.map(p => <ProtocolCard key={p.id} protocol={p} onClick={() => setSelected(p)} />)}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#8C7F6E", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                            Todos los protocolos
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {rest.map(p => <ProtocolCard key={p.id} protocol={p} onClick={() => setSelected(p)} />)}
                        </div>
                    </>
                )}

                {/* Lista completa sin sugerencias */}
                {showAll && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {PROTOCOLS.map(p => <ProtocolCard key={p.id} protocol={p} onClick={() => setSelected(p)} />)}
                    </div>
                )}

                {/* Resultados */}
                {showResults && (
                    <div>
                        {displayResults.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "48px 20px" }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1512", marginBottom: 6 }}>Sin resultados para "{query}"</p>
                                <p style={{ fontSize: 12, color: "#8C7F6E" }}>Prueba con: convulsión, sangrado, no respira, quemadura…</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#8C7F6E", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                                    {displayResults.length} resultado{displayResults.length !== 1 ? "s" : ""}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {displayResults.map(r => <ProtocolCard key={r.protocol.id} protocol={r.protocol} onClick={() => setSelected(r.protocol)} />)}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div style={{ marginTop: 28, padding: "12px 14px", background: "#F3EFE7", borderRadius: 12, border: "1px solid #E8E2D8" }}>
                    <p style={{ fontSize: 11, color: "#8C7F6E", margin: 0, lineHeight: 1.6 }}>
                        <strong style={{ color: "#1A1512" }}>Aviso:</strong> Orientativo — no sustituye atención médica. En riesgo vital llama al <strong>123</strong>.
                    </p>
                </div>
            </div>

            {selected && <ProtocolModal protocol={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}

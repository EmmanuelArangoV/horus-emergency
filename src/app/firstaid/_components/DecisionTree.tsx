"use client";
import { useState } from "react";
import type { DecisionNode, ProtocolStep } from "@/lib/firstaid/types";
import StepTimer from "./StepTimer";
import StepIllustration from "./StepIllustration";

export default function DecisionTree({ nodes }: { nodes: DecisionNode[] }) {
    const [currentId, setCurrentId] = useState<string | null>(nodes[0]?.id ?? null);
    const [history,   setHistory]   = useState<string[]>([]);
    const [final,     setFinal]     = useState<ProtocolStep[] | null>(null);

    const node = nodes.find(n => n.id === currentId);

    function choose(branch: "yes" | "no") {
        if (!node) return;
        const next = node[branch];
        if (Array.isArray(next)) {
            setFinal(next as ProtocolStep[]);
            setCurrentId(null);
        } else {
            setHistory(h => [...h, node.id]);
            setCurrentId(next as string);
        }
    }

    function back() {
        if (final) {
            setFinal(null);
            setCurrentId(history.at(-1) ?? null);
            setHistory(h => h.slice(0, -1));
        } else if (history.length > 0) {
            setCurrentId(history.at(-1) ?? null);
            setHistory(h => h.slice(0, -1));
        }
    }

    return (
        <div>
            {(history.length > 0 || final) && (
                <button onClick={back} style={{ fontSize: 11, fontWeight: 700, color: "#8C7F6E", background: "none", border: "none", cursor: "pointer", padding: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 4 }}>
                    ← Volver
                </button>
            )}

            {final ? (
                <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#27AE60", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
                        ✓ Evaluación completada — sigue estos pasos
                    </div>
                    {final.map((step, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#27AE60", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                                <p style={{ fontSize: 13, fontWeight: 500, color: "#1A1512", lineHeight: 1.5, margin: 0 }}>{step.instruction}</p>
                            </div>
                            {step.illustration && <div style={{ paddingLeft: 32 }}><StepIllustration type={step.illustration} /></div>}
                            {step.duration && <div style={{ paddingLeft: 32 }}><StepTimer duration={step.duration} /></div>}
                        </div>
                    ))}
                </div>
            ) : node ? (
                <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1A1512", marginBottom: 14, lineHeight: 1.5 }}>{node.question}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button onClick={() => choose("yes")} style={{ padding: "12px 16px", borderRadius: 12, border: "2px solid #27AE60", background: "rgba(39,174,96,0.06)", color: "#1A3D0A", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                            Sí
                        </button>
                        <button onClick={() => choose("no")} style={{ padding: "12px 16px", borderRadius: 12, border: "2px solid #E74C3C", background: "rgba(231,76,60,0.06)", color: "#7F1D1D", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                            No
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

"use client";
import { useState, useEffect } from "react";

export default function StepTimer({ duration }: { duration: number }) {
    const [left,   setLeft]   = useState(duration);
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (!active || left === 0) return;
        const t = setInterval(() => setLeft(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [active, left]);

    const min = Math.floor(left / 60);
    const sec = left % 60;
    const pct = ((duration - left) / duration) * 100;

    return (
        <div style={{ marginTop: 10, background: "#F3EFE7", borderRadius: 12, padding: "10px 14px", border: "1px solid #E8E2D8" }}>
            {/* Barra de progreso */}
            <div style={{ height: 3, background: "#E8E2D8", borderRadius: 99, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: left === 0 ? "#27AE60" : "#C0392B", borderRadius: 99, transition: "width 1s linear" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: left === 0 ? "#27AE60" : "#1A1512", letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" }}>
                    {min > 0 ? `${min}:${sec.toString().padStart(2, "0")}` : `${sec}s`}
                </span>

                {left === 0 ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#27AE60", textTransform: "uppercase", letterSpacing: "0.1em" }}>¡Completado!</span>
                ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                        <button
                            onClick={() => { setLeft(duration); setActive(false); }}
                            style={{ fontSize: 11, fontWeight: 600, color: "#8C7F6E", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
                        >
                            Reiniciar
                        </button>
                        <button
                            onClick={() => setActive(a => !a)}
                            style={{ fontSize: 12, fontWeight: 700, color: active ? "#1A1512" : "#F9F6ED", background: active ? "#E8E2D8" : "#1A1512", border: "none", borderRadius: 8, padding: "5px 14px", cursor: "pointer" }}
                        >
                            {active ? "Pausar" : "Iniciar"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

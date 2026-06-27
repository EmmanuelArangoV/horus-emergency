import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ScanLogger from "./ScanLogger";

export const metadata: Metadata = {
    title: "ID Médico · Horus",
    description: "Ficha médica de emergencia Horus",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function bloodTypeLabel(bt: string) {
    return bt
        .replace("_POSITIVE", "+").replace("_NEGATIVE", "-")
        .replace("A_", "A").replace("B_", "B").replace("O_", "O").replace("AB_", "AB");
}

function severityColor(s: string): string {
    switch (s?.toUpperCase()) {
        case "LIFE_THREATENING": return "#C0392B";
        case "SEVERE":           return "#E74C3C";
        case "MODERATE":         return "#E67E22";
        default:                 return "#27AE60";
    }
}

function severityLabel(s: string): string {
    switch (s?.toUpperCase()) {
        case "LIFE_THREATENING": return "Riesgo vital";
        case "SEVERE":           return "Severa";
        case "MODERATE":         return "Moderada";
        default:                 return "Leve";
    }
}

function conditionStatusLabel(s: string): string {
    const m: Record<string, string> = {
        ACTIVE: "Activa", MANAGED: "Controlada",
        IN_REMISSION: "En remisión", RESOLVED: "Resuelta",
    };
    return m[s] ?? s;
}

function calcAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
}

// ── SVG atoms ─────────────────────────────────────────────────────────────────

const PhoneIcon = ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.92a16 16 0 0 0 6.1 6.1l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const BloodIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
);

const WarningIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EmergencyPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            personalInfo:      true,
            medicalProfile:    true,
            allergies:         { orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] },
            chronicConditions: { orderBy: [{ createdAt: "desc" }] },
            medications:       { where: { isCurrent: true }, include: { medication: true } },
            emergencyContacts: { where: { isActive: true }, orderBy: { priorityOrder: "asc" } },
            privacySettings:   true,
        },
    });

    if (!user) notFound();

    const priv = user.privacySettings;
    const p    = user.personalInfo;
    const m    = user.medicalProfile;

    const showName     = priv?.showFullName          !== false;
    const showAge      = priv?.showAge               !== false;
    const showBlood    = priv?.showBloodType         !== false;
    const showAlrg     = priv?.showAllergies         !== false;
    const showMeds     = priv?.showMedications       !== false;
    const showCond     = priv?.showChronicConditions !== false;
    const showContacts = priv?.showEmergencyContacts !== false;
    const showHistory  = priv?.showMedicalHistory    !== false;

    const name     = showName && p ? `${p.firstName} ${p.lastName}` : "Paciente Horus";
    const age      = showAge && p?.dateOfBirth ? calcAge(new Date(p.dateOfBirth)) : null;
    const blood    = showBlood && p?.bloodType ? bloodTypeLabel(p.bloodType) : null;
    const gender   = p?.gender === "MALE" ? "Masculino" : p?.gender === "FEMALE" ? "Femenino" : null;

    const allAllergies      = showAlrg     ? user.allergies         : [];
    const activeAllergies   = allAllergies.filter(a => a.isActive);
    const historicAllergies = allAllergies.filter(a => !a.isActive);
    const meds              = showMeds     ? user.medications       : [];
    const allConditions     = showCond     ? user.chronicConditions : [];
    const activeConditions  = allConditions.filter(c => c.status === "ACTIVE" || c.status === "MANAGED");
    const historicCond      = allConditions.filter(c => c.status === "IN_REMISSION" || c.status === "RESOLVED");
    const contacts          = showContacts ? user.emergencyContacts : [];
    const lifeThreats       = activeAllergies.filter(a => a.severity === "LIFE_THREATENING");

    const hasMedical = allAllergies.length > 0 || meds.length > 0 || allConditions.length > 0;
    const now = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

    const extraTags: { label: string; green?: boolean }[] = [
        m?.heightCm      ? { label: `${Number(m.heightCm)} cm` }       : null,
        m?.weightKg      ? { label: `${Number(m.weightKg)} kg` }       : null,
        m?.organDonor    ? { label: "Donante de órganos", green: true } : null,
        m?.insuranceProvider ? { label: m.insuranceProvider }           : null,
    ].filter(Boolean) as { label: string; green?: boolean }[];

    return (
        <>
            <ScanLogger userId={userId} />

            {/* ── MOBILE layout ──────────────────────────────────────────────── */}
            <div className="md:hidden" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: "var(--bg)", color: "var(--primary)", padding: "20px 16px 48px", maxWidth: 480, margin: "0 auto" }}>
                {/* Top bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, paddingTop: 4 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--primary)" }}>
                        HORUS <span style={{ color: "var(--muted)", fontWeight: 400 }}>Medical ID</span>
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", background: "var(--muted-bg)", color: "var(--muted)", padding: "6px 14px", borderRadius: 999, border: "1px solid var(--border)" }}>
                        ID Médico
                    </div>
                </div>

                <MobileContent
                    name={name} age={age} gender={gender} blood={blood} extraTags={extraTags}
                    photoUrl={p?.photoUrl ?? null} showPhoto={priv?.showPhoto !== false}
                    lifeThreats={lifeThreats}
                    allAllergies={allAllergies} activeAllergies={activeAllergies} historicAllergies={historicAllergies}
                    meds={meds} allConditions={allConditions} activeConditions={activeConditions} historicCond={historicCond}
                    contacts={contacts} hasMedical={hasMedical}
                    showHistory={showHistory} additionalNotes={m?.additionalNotes ?? null}
                    now={now}
                />

                {/* Botón primeros auxilios */}
                <a href={`/firstaid?from=${userId}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 20, background: "#1A1512", color: "#F9F6ED", borderRadius: 18, padding: "17px 24px", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "-0.1px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    Guía de primeros auxilios
                </a>
            </div>

            {/* ── DESKTOP layout ─────────────────────────────────────────────── */}
            <div className="hidden md:block min-h-screen" style={{ fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif", background: "var(--bg)", color: "var(--primary)" }}>

                {/* Contenido 2 columnas */}
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 40px 56px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start" }}>

                    {/* Alerta crítica — flotante en la columna derecha arriba */}
                    {lifeThreats.length > 0 && (
                        <div style={{ gridColumn: "1 / -1", background: "#FDECEA", borderRadius: 16, padding: "14px 20px", border: "2px solid #C0392B", display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <WarningIcon />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "#C0392B", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                                    ¡Alergia de riesgo vital!
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
                                    {lifeThreats.map(a => (
                                        <span key={a.id} style={{ fontSize: 14, fontWeight: 700, color: "#7F1D1D" }}>
                                            • {a.allergenName}
                                            {a.reactionDescription && <span style={{ fontWeight: 400 }}> — {a.reactionDescription}</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Columna izquierda ─────────────────────────── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* Identidad */}
                        <DesktopCard>
                            {priv?.showPhoto !== false && p?.photoUrl ? (
                                <img src={p.photoUrl} alt="Foto" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", marginBottom: 14 }} />
                            ) : (
                                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--muted-bg)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}

                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--primary)", letterSpacing: "-0.3px", lineHeight: 1.2, marginBottom: 4 }}>
                                {name}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginBottom: 14 }}>
                                {[age !== null ? `${age} años` : null, gender].filter(Boolean).join(" · ")}
                            </div>

                            {blood && blood !== "—" && (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--pink)", borderRadius: 14, padding: "9px 18px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--pink-fg)", marginBottom: 14 }}>
                                    <BloodIcon />
                                    Tipo {blood}
                                </div>
                            )}

                            {extraTags.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {extraTags.map((t, i) => (
                                        <span key={i} style={{
                                            background: t.green ? "rgba(150,201,121,0.18)" : "var(--muted-bg)",
                                            color: t.green ? "var(--green-fg)" : "var(--muted)",
                                            border: `1px solid ${t.green ? "rgba(150,201,121,0.35)" : "var(--border)"}`,
                                            borderRadius: 10, padding: "5px 13px", fontSize: 12, fontWeight: t.green ? 600 : 500,
                                        }}>
                                            {t.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </DesktopCard>

                        {/* Contactos de emergencia */}
                        {contacts.length > 0 && (
                            <DesktopCard>
                                <SectionLabel>Contactos de emergencia</SectionLabel>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {contacts.map(c => (
                                        <div key={c.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
                                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{c.fullName}</span>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-fg)", background: "var(--blue)", borderRadius: 6, padding: "2px 8px" }}>{c.relationship}</span>
                                            </div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                <a href={`tel:${c.phonePrimary}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 700, background: "var(--card)", borderRadius: 10, padding: "6px 12px", border: "1px solid var(--border)" }}>
                                                    <PhoneIcon />
                                                    {c.phonePrimary}
                                                </a>
                                                {c.phoneSecondary && (
                                                    <a href={`tel:${c.phoneSecondary}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 700, background: "var(--card)", borderRadius: 10, padding: "6px 12px", border: "1px solid var(--border)" }}>
                                                        <PhoneIcon />
                                                        {c.phoneSecondary}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DesktopCard>
                        )}

                        {/* Botones de llamada */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <a href="tel:123" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--primary)", color: "#F9F6ED", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, padding: "15px 20px", borderRadius: 16, textAlign: "center" }}>
                                <PhoneIcon size={16} color="#F9F6ED" /> Emergencias · 123
                            </a>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                <a href="tel:132" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FAD957", color: "#1A1512", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, padding: "13px 12px", borderRadius: 14, textAlign: "center" }}>
                                    <PhoneIcon size={14} color="#1A1512" /> Cruz Roja · 132
                                </a>
                                <a href="tel:119" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#FAD957", color: "#1A1512", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, padding: "13px 12px", borderRadius: 14, textAlign: "center" }}>
                                    <PhoneIcon size={14} color="#1A1512" /> Bomberos · 119
                                </a>
                            </div>
                        </div>

                        {/* Botón primeros auxilios */}
                        <a href={`/firstaid?from=${userId}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#F3EFE7", color: "#1A1512", borderRadius: 14, padding: "13px 16px", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, border: "1.5px solid #E8E2D8" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                            Guía de primeros auxilios
                        </a>

                        {/* Footer desktop */}
                        <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", lineHeight: 2, marginTop: 4 }}>
                            Generado por Horus Medical ID
                            <br />
                            {now}
                        </div>
                    </div>

                    {/* ── Columna derecha ───────────────────────────── */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {hasMedical && (
                            <DesktopCard>
                                {/* Alergias */}
                                {allAllergies.length > 0 && (
                                    <div style={{ marginBottom: meds.length > 0 || allConditions.length > 0 ? 20 : 0 }}>
                                        <SectionLabel>Alergias activas</SectionLabel>
                                        {activeAllergies.length === 0 ? (
                                            <p style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>Sin alergias activas</p>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {activeAllergies.map(a => (
                                                    <div key={a.id} style={{ borderLeft: `3px solid ${severityColor(a.severity)}`, paddingLeft: 12 }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{a.allergenName}</span>
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, whiteSpace: "nowrap", background: severityColor(a.severity) + "22", color: severityColor(a.severity) }}>
                                                                {severityLabel(a.severity)}
                                                            </span>
                                                        </div>
                                                        {a.reactionDescription && (
                                                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{a.reactionDescription}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {historicAllergies.length > 0 && (
                                            <div style={{ marginTop: 14 }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 8, opacity: 0.6 }}>Historial (inactivas)</div>
                                                {historicAllergies.map(a => (
                                                    <div key={a.id} style={{ borderLeft: "3px solid #ccc", paddingLeft: 12, marginBottom: 8, opacity: 0.55 }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "line-through" }}>{a.allergenName}</span>
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "#eee", color: "#999" }}>{severityLabel(a.severity)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Medicamentos */}
                                {meds.length > 0 && (
                                    <div style={{ marginBottom: allConditions.length > 0 ? 20 : 0, paddingTop: allAllergies.length > 0 ? 20 : 0, borderTop: allAllergies.length > 0 ? "1px solid var(--border)" : "none" }}>
                                        <SectionLabel>Medicamentos actuales</SectionLabel>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {meds.map(med => {
                                                const medName = med.customMedicationName ?? med.medication?.genericName ?? "—";
                                                return (
                                                    <div key={med.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{medName}</span>
                                                            {med.dosage && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "var(--border)", color: "var(--muted)" }}>{med.dosage}</span>}
                                                        </div>
                                                        {med.frequency && (
                                                            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                                                                {med.frequency}{med.route && med.route !== "ORAL" ? ` · ${med.route.toLowerCase()}` : ""}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Condiciones */}
                                {allConditions.length > 0 && (
                                    <div style={{ paddingTop: (allAllergies.length > 0 || meds.length > 0) ? 20 : 0, borderTop: (allAllergies.length > 0 || meds.length > 0) ? "1px solid var(--border)" : "none" }}>
                                        <SectionLabel>Condiciones médicas</SectionLabel>
                                        {activeConditions.length === 0 ? (
                                            <p style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>Sin condiciones activas</p>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {activeConditions.map(c => (
                                                    <div key={c.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "12px 14px", border: "1px solid var(--border)" }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{c.conditionName}</span>
                                                            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "var(--border)", color: "var(--muted)" }}>
                                                                {conditionStatusLabel(c.status)}{c.severity ? ` · ${c.severity.toLowerCase()}` : ""}
                                                            </span>
                                                        </div>
                                                        {c.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{c.notes}</div>}
                                                    </div>
                                                ))}
                                                {historicCond.length > 0 && (
                                                    <div style={{ marginTop: 6 }}>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 8, opacity: 0.6 }}>Historial</div>
                                                        {historicCond.map(c => (
                                                            <div key={c.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "10px 14px", border: "1px solid var(--border)", opacity: 0.55, marginBottom: 6 }}>
                                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "line-through" }}>{c.conditionName}</span>
                                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "var(--border)", color: "var(--muted)" }}>{conditionStatusLabel(c.status)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </DesktopCard>
                        )}

                        {/* Notas médicas */}
                        {showHistory && m?.additionalNotes && (
                            <DesktopCard>
                                <SectionLabel>Notas médicas</SectionLabel>
                                <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--primary)", marginTop: 8 }}>{m.additionalNotes}</p>
                            </DesktopCard>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ── Componentes de soporte ────────────────────────────────────────────────────

function DesktopCard({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ background: "var(--card)", borderRadius: 24, padding: 24, border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(26,21,18,0.04), 0 6px 20px rgba(26,21,18,0.05)" }}>
            {children}
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 12 }}>
            {children}
        </div>
    );
}

// ── MobileContent ─────────────────────────────────────────────────────────────

function MobileContent({ name, age, gender, blood, extraTags, photoUrl, showPhoto, lifeThreats, allAllergies, activeAllergies, historicAllergies, meds, allConditions, activeConditions, historicCond, contacts, hasMedical, showHistory, additionalNotes, now }: {
    name: string; age: number | null; gender: string | null; blood: string | null;
    extraTags: { label: string; green?: boolean }[];
    photoUrl: string | null; showPhoto: boolean;
    lifeThreats: { id: string; allergenName: string; severity: string; reactionDescription: string | null }[];
    allAllergies: { id: string; allergenName: string; severity: string; reactionDescription: string | null; isActive: boolean }[];
    activeAllergies: typeof allAllergies; historicAllergies: typeof allAllergies;
    meds: { id: string; customMedicationName: string | null; dosage: string | null; frequency: string | null; route: string | null; medication: { genericName: string } | null }[];
    allConditions: { id: string; conditionName: string; status: string; severity: string | null; notes: string | null }[];
    activeConditions: typeof allConditions; historicCond: typeof allConditions;
    contacts: { id: string; fullName: string; relationship: string; phonePrimary: string; phoneSecondary: string | null }[];
    hasMedical: boolean; showHistory: boolean; additionalNotes: string | null; now: string;
}) {
    const C = (color: string) => ({ color });
    return (
        <>
            {/* Alerta crítica */}
            {lifeThreats.length > 0 && (
                <div style={{ background: "#FDECEA", borderRadius: 16, padding: 16, marginBottom: 12, border: "2px solid #C0392B" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 13, fontWeight: 800, color: "#C0392B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <WarningIcon /> ¡Alergia de riesgo vital!
                    </div>
                    {lifeThreats.map(a => (
                        <div key={a.id} style={{ fontSize: 14, fontWeight: 700, color: "#7F1D1D", marginBottom: 4 }}>
                            • {a.allergenName}{a.reactionDescription && <span style={{ fontWeight: 400 }}> — {a.reactionDescription}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Identidad */}
            <div style={{ background: "var(--card)", borderRadius: 24, padding: 20, marginBottom: 12, border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(26,21,18,0.04), 0 6px 20px rgba(26,21,18,0.05)" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--primary)", lineHeight: 1.15, letterSpacing: "-0.5px", marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16, fontWeight: 500 }}>
                    {[age !== null ? `${age} años` : null, gender].filter(Boolean).join(" · ")}
                </div>
                {blood && blood !== "—" && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--pink)", borderRadius: 14, padding: "9px 18px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 700, color: "var(--pink-fg)", marginBottom: 14 }}>
                        <BloodIcon /> Tipo {blood}
                    </div>
                )}
                {extraTags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {extraTags.map((t, i) => (
                            <span key={i} style={{ background: t.green ? "rgba(150,201,121,0.18)" : "var(--muted-bg)", color: t.green ? "var(--green-fg)" : "var(--muted)", border: `1px solid ${t.green ? "rgba(150,201,121,0.35)" : "var(--border)"}`, borderRadius: 10, padding: "5px 13px", fontSize: 12, fontWeight: t.green ? 600 : 500 }}>
                                {t.label}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Secciones médicas */}
            {hasMedical && (
                <div style={{ background: "var(--card)", borderRadius: 24, padding: 20, marginBottom: 12, border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(26,21,18,0.04), 0 6px 20px rgba(26,21,18,0.05)" }}>
                    {allAllergies.length > 0 && (
                        <div style={{ marginBottom: meds.length > 0 || allConditions.length > 0 ? 16 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>Alergias activas</div>
                            {activeAllergies.length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>Sin alergias activas</div>
                            ) : activeAllergies.map(a => (
                                <div key={a.id} style={{ borderLeft: `3px solid ${severityColor(a.severity)}`, paddingLeft: 12, marginBottom: 10 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{a.allergenName}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, whiteSpace: "nowrap", background: severityColor(a.severity) + "22", color: severityColor(a.severity) }}>{severityLabel(a.severity)}</span>
                                    </div>
                                    {a.reactionDescription && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, lineHeight: 1.55 }}>{a.reactionDescription}</div>}
                                </div>
                            ))}
                            {historicAllergies.length > 0 && (
                                <>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 8, marginTop: 14, opacity: 0.6 }}>Historial (inactivas)</div>
                                    {historicAllergies.map(a => (
                                        <div key={a.id} style={{ borderLeft: "3px solid #ccc", paddingLeft: 12, marginBottom: 8, opacity: 0.55 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "line-through" }}>{a.allergenName}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "#eee", color: "#999" }}>{severityLabel(a.severity)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                    {meds.length > 0 && (
                        <div style={{ marginBottom: allConditions.length > 0 ? 16 : 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>Medicamentos actuales</div>
                            {meds.map(med => {
                                const medName = med.customMedicationName ?? med.medication?.genericName ?? "—";
                                return (
                                    <div key={med.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: "1px solid var(--border)" }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{medName}</span>
                                            {med.dosage && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "var(--border)", color: "var(--muted)" }}>{med.dosage}</span>}
                                        </div>
                                        {med.frequency && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{med.frequency}{med.route && med.route !== "ORAL" ? ` · ${med.route.toLowerCase()}` : ""}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {allConditions.length > 0 && (
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>Condiciones médicas</div>
                            {activeConditions.length === 0 ? (
                                <div style={{ fontSize: 12, color: "var(--muted)", padding: "4px 0" }}>Sin condiciones activas</div>
                            ) : activeConditions.map(c => (
                                <div key={c.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: "1px solid var(--border)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)" }}>{c.conditionName}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "var(--border)", color: "var(--muted)" }}>{conditionStatusLabel(c.status)}{c.severity ? ` · ${c.severity.toLowerCase()}` : ""}</span>
                                    </div>
                                    {c.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5 }}>{c.notes}</div>}
                                </div>
                            ))}
                            {historicCond.length > 0 && (
                                <>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 8, marginTop: 14, opacity: 0.6 }}>Historial</div>
                                    {historicCond.map(c => (
                                        <div key={c.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "10px 14px", marginBottom: 6, border: "1px solid var(--border)", opacity: 0.55 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "line-through" }}>{c.conditionName}</span>
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "var(--border)", color: "var(--muted)" }}>{conditionStatusLabel(c.status)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Notas médicas */}
            {showHistory && additionalNotes && (
                <div style={{ background: "var(--card)", borderRadius: 24, padding: 20, marginBottom: 12, border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(26,21,18,0.04), 0 6px 20px rgba(26,21,18,0.05)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>Notas médicas</div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--primary)" }}>{additionalNotes}</div>
                </div>
            )}

            {/* Contactos */}
            {contacts.length > 0 && (
                <div style={{ background: "var(--card)", borderRadius: 24, padding: 20, marginBottom: 12, border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(26,21,18,0.04), 0 6px 20px rgba(26,21,18,0.05)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10 }}>Contactos de emergencia</div>
                    {contacts.map(c => (
                        <div key={c.id} style={{ background: "var(--muted-bg)", borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--primary)" }}>{c.fullName}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--blue-fg)", background: "var(--blue)", borderRadius: 6, padding: "2px 8px" }}>{c.relationship}</span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <a href={`tel:${c.phonePrimary}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--primary)", textDecoration: "none", fontSize: 14, fontWeight: 700, background: "var(--muted-bg)", borderRadius: 10, padding: "7px 14px", border: "1px solid var(--border)" }}>
                                    <PhoneIcon /> {c.phonePrimary}
                                </a>
                                {c.phoneSecondary && (
                                    <a href={`tel:${c.phoneSecondary}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--primary)", textDecoration: "none", fontSize: 14, fontWeight: 700, background: "var(--muted-bg)", borderRadius: 10, padding: "7px 14px", border: "1px solid var(--border)" }}>
                                        <PhoneIcon /> {c.phoneSecondary}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Botones de llamada */}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="tel:123" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "var(--primary)", color: "#F9F6ED", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "-0.1px", padding: "17px 24px", borderRadius: 18, textAlign: "center" }}>
                    <PhoneIcon size={18} color="#F9F6ED" /> Emergencias · 123
                </a>
                <a href="tel:132" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#FAD957", color: "#1A1512", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, padding: "17px 24px", borderRadius: 18, textAlign: "center" }}>
                    <PhoneIcon size={18} color="#1A1512" /> Cruz Roja · 132
                </a>
                <a href="tel:119" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#FAD957", color: "#1A1512", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, padding: "17px 24px", borderRadius: 18, textAlign: "center" }}>
                    <PhoneIcon size={18} color="#1A1512" /> Bomberos · 119
                </a>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 28, lineHeight: 2 }}>
                Generado por Horus Medical ID
                <span style={{ display: "inline-block", width: 3, height: 3, borderRadius: "50%", background: "var(--border)", margin: "0 7px", verticalAlign: "middle" }} />
                {now}
            </div>
        </>
    );
}

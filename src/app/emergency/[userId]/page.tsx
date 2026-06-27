import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import ScanLogger from "./ScanLogger";

export const metadata: Metadata = {
    title: "ID Médico · Horus",
    description: "Ficha médica de emergencia Horus",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function bloodTypeLabel(bt: string) {
    return bt.replace("_POSITIVE", "+").replace("_NEGATIVE", "-").replace("_", "");
}

function severityColor(s: string) {
    if (s === "LIFE_THREATENING") return { bg: "#FEE2E2", text: "#991B1B", label: "Riesgo vital" };
    if (s === "SEVERE")           return { bg: "#FEF3C7", text: "#92400E", label: "Severa" };
    if (s === "MODERATE")         return { bg: "#FEF9C3", text: "#854D0E", label: "Moderada" };
    return                               { bg: "#F0FDF4", text: "#166534", label: "Leve" };
}

function conditionStatusLabel(s: string) {
    const m: Record<string, string> = {
        ACTIVE: "Activa", MANAGED: "Controlada",
        IN_REMISSION: "En remisión", RESOLVED: "Resuelta",
    };
    return m[s] ?? s;
}

function genderLabel(g: string) {
    const m: Record<string, string> = {
        MALE: "Masculino", FEMALE: "Femenino",
        OTHER: "Otro", PREFER_NOT_TO_SAY: "No especificado",
    };
    return m[g] ?? g;
}

function calcAge(dob: Date) {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
            allergies:         { where: { isActive: true }, orderBy: [{ severity: "asc" }, { allergenName: "asc" }] },
            chronicConditions: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
            medications:       { where: { isCurrent: true }, include: { medication: true } },
            emergencyContacts: { where: { isActive: true }, orderBy: { priorityOrder: "asc" } },
            medicalHistory:    { orderBy: { eventDate: "desc" } },
            privacySettings:   true,
        },
    });

    if (!user) notFound();

    const p = user.privacySettings;
    const info = user.personalInfo;

    const show = {
        fullName:          p?.showFullName          !== false,
        photo:             p?.showPhoto             !== false,
        age:               p?.showAge               !== false,
        bloodType:         p?.showBloodType         !== false,
        allergies:         p?.showAllergies         !== false,
        medications:       p?.showMedications       !== false,
        chronicConditions: p?.showChronicConditions !== false,
        emergencyContacts: p?.showEmergencyContacts !== false,
        medicalHistory:    p?.showMedicalHistory    !== false,
    };

    const fullName  = info ? `${info.firstName} ${info.lastName}` : null;
    const age       = info?.dateOfBirth ? calcAge(new Date(info.dateOfBirth)) : null;
    const bloodType = info?.bloodType ? bloodTypeLabel(info.bloodType) : null;

    const lifeThreateningAllergies = user.allergies.filter(a => a.severity === "LIFE_THREATENING");

    return (
        <>
            <ScanLogger userId={userId} />

            <div className="min-h-screen bg-[#F2F1EC]">

                {/* ── Top bar ──────────────────────────────────────────── */}
                <header className="bg-[#1A1512] px-4 py-3 flex items-center gap-3">
                    <img src="/logo.svg" alt="Horus" className="w-7 h-7 object-contain" />
                    <div>
                        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest leading-none">Horus</p>
                        <p className="text-white text-sm font-black leading-tight">ID Médico de Emergencia</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 bg-[#EF4444]/20 border border-[#EF4444]/30 rounded-full px-3 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                        <span className="text-[#EF4444] text-[11px] font-bold">EMERGENCIA</span>
                    </div>
                </header>

                <main className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

                    {/* ── Alerta crítica de alergias ─────────────────── */}
                    {show.allergies && lifeThreateningAllergies.length > 0 && (
                        <div className="bg-[#FEE2E2] border-2 border-[#EF4444] rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-5 h-5 text-[#DC2626] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <p className="text-[#991B1B] font-black text-sm uppercase tracking-wide">¡Alergia de riesgo vital!</p>
                            </div>
                            <div className="flex flex-col gap-1">
                                {lifeThreateningAllergies.map(a => (
                                    <p key={a.id} className="text-[#7F1D1D] font-bold text-sm">
                                        • {a.allergenName}
                                        {a.reactionDescription && <span className="font-normal"> — {a.reactionDescription}</span>}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Datos personales ───────────────────────────── */}
                    <div className="bg-white rounded-2xl p-4 border border-[#E4E2DC] shadow-sm">
                        <div className="flex items-start gap-4">
                            {show.photo && info?.photoUrl ? (
                                <img src={info.photoUrl} alt="Foto" className="w-16 h-16 rounded-full object-cover border-2 border-[#E4E2DC] shrink-0" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-[#F2F1EC] border-2 border-[#E4E2DC] flex items-center justify-center shrink-0">
                                    <svg className="w-8 h-8 text-[#8D99AE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                    </svg>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                {show.fullName && fullName && (
                                    <h1 className="text-xl font-black text-[#1A1512] leading-tight">{fullName}</h1>
                                )}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                    {show.age && age !== null && (
                                        <span className="text-sm text-[#8D99AE] font-semibold">{age} años</span>
                                    )}
                                    {info?.gender && (
                                        <span className="text-sm text-[#8D99AE] font-semibold">{genderLabel(info.gender)}</span>
                                    )}
                                </div>
                                {user.medicalProfile?.organDonor && (
                                    <span className="inline-flex items-center gap-1 mt-2 bg-[#DCFCE7] text-[#166534] text-[11px] font-bold px-2 py-0.5 rounded-full">
                                        ♥ Donante de órganos
                                    </span>
                                )}
                            </div>

                            {/* Tipo de sangre — destacado */}
                            {show.bloodType && bloodType && (
                                <div className="shrink-0 flex flex-col items-center justify-center bg-[#EF4444] rounded-xl w-14 h-14">
                                    <p className="text-white text-[9px] font-bold uppercase leading-none mb-0.5">Sangre</p>
                                    <p className="text-white text-xl font-black leading-none">{bloodType}</p>
                                </div>
                            )}
                        </div>

                        {/* Datos médicos básicos */}
                        {(user.medicalProfile?.heightCm || user.medicalProfile?.weightKg || user.medicalProfile?.insuranceProvider) && (
                            <div className="mt-3 pt-3 border-t border-[#E4E2DC] flex flex-wrap gap-3">
                                {user.medicalProfile.heightCm && (
                                    <div>
                                        <p className="text-[10px] text-[#8D99AE] font-semibold uppercase tracking-wide">Altura</p>
                                        <p className="text-sm font-bold text-[#1A1512]">{Number(user.medicalProfile.heightCm)} cm</p>
                                    </div>
                                )}
                                {user.medicalProfile.weightKg && (
                                    <div>
                                        <p className="text-[10px] text-[#8D99AE] font-semibold uppercase tracking-wide">Peso</p>
                                        <p className="text-sm font-bold text-[#1A1512]">{Number(user.medicalProfile.weightKg)} kg</p>
                                    </div>
                                )}
                                {user.medicalProfile.insuranceProvider && (
                                    <div>
                                        <p className="text-[10px] text-[#8D99AE] font-semibold uppercase tracking-wide">Aseguradora</p>
                                        <p className="text-sm font-bold text-[#1A1512]">{user.medicalProfile.insuranceProvider}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Alergias ───────────────────────────────────── */}
                    {show.allergies && user.allergies.length > 0 && (
                        <section className="bg-white rounded-2xl p-4 border border-[#E4E2DC] shadow-sm">
                            <SectionTitle icon="🧪" label="Alergias" />
                            <div className="flex flex-col gap-2 mt-3">
                                {user.allergies.map(a => {
                                    const sv = severityColor(a.severity);
                                    return (
                                        <div key={a.id} className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#1A1512]">{a.allergenName}</p>
                                                <p className="text-[11px] text-[#8D99AE]">{a.allergyType === "MEDICATION" ? "Medicamento" : a.allergyType === "FOOD" ? "Alimento" : a.allergyType === "ENVIRONMENTAL" ? "Ambiental" : "Otro"}</p>
                                                {a.reactionDescription && (
                                                    <p className="text-[11px] text-[#6B7280] mt-0.5 italic">{a.reactionDescription}</p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: sv.bg, color: sv.text }}>
                                                {sv.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ── Medicamentos ───────────────────────────────── */}
                    {show.medications && user.medications.length > 0 && (
                        <section className="bg-white rounded-2xl p-4 border border-[#E4E2DC] shadow-sm">
                            <SectionTitle icon="💊" label="Medicamentos actuales" />
                            <div className="flex flex-col gap-2 mt-3">
                                {user.medications.map(m => {
                                    const name = m.customMedicationName ?? m.medication?.genericName ?? "Sin nombre";
                                    return (
                                        <div key={m.id} className="flex items-start gap-2 py-1.5 border-b border-[#F2F1EC] last:border-0">
                                            <div className="w-6 h-6 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-[10px]">💊</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-[#1A1512]">{name}</p>
                                                <div className="flex flex-wrap gap-2 mt-0.5">
                                                    {m.dosage    && <span className="text-[11px] text-[#8D99AE]">{m.dosage}</span>}
                                                    {m.frequency && <span className="text-[11px] text-[#8D99AE]">· {m.frequency}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* ── Condiciones crónicas ───────────────────────── */}
                    {show.chronicConditions && user.chronicConditions.length > 0 && (
                        <section className="bg-white rounded-2xl p-4 border border-[#E4E2DC] shadow-sm">
                            <SectionTitle icon="🫀" label="Condiciones médicas" />
                            <div className="flex flex-col gap-2 mt-3">
                                {user.chronicConditions.map(c => (
                                    <div key={c.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-[#F2F1EC] last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[#1A1512]">{c.conditionName}</p>
                                            {c.notes && <p className="text-[11px] text-[#8D99AE] mt-0.5">{c.notes}</p>}
                                        </div>
                                        <span className="shrink-0 text-[11px] font-semibold text-[#8D99AE] bg-[#F2F1EC] px-2 py-0.5 rounded-full">
                                            {conditionStatusLabel(c.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Notas médicas ─────────────────────────────── */}
                    {show.medicalHistory && user.medicalProfile?.additionalNotes && (
                        <section className="bg-white rounded-2xl p-4 border border-[#E4E2DC] shadow-sm">
                            <SectionTitle icon="📋" label="Notas médicas" />
                            <p className="text-sm text-[#374151] mt-2 leading-relaxed">{user.medicalProfile.additionalNotes}</p>
                        </section>
                    )}

                    {/* ── Contactos de emergencia ────────────────────── */}
                    {show.emergencyContacts && user.emergencyContacts.length > 0 && (
                        <section className="bg-[#1A1512] rounded-2xl p-4 shadow-sm">
                            <SectionTitle icon="📞" label="Contactos de emergencia" light />
                            <div className="flex flex-col gap-3 mt-3">
                                {user.emergencyContacts.map((c, i) => (
                                    <div key={c.id} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white font-black text-sm">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-bold text-sm leading-tight">{c.fullName}</p>
                                            <p className="text-white/50 text-[11px]">{c.relationship}</p>
                                        </div>
                                        <a href={`tel:${c.phonePrimary}`}
                                            className="flex items-center gap-1.5 bg-[#FAD957] text-[#1A1512] font-bold text-xs px-3 py-2 rounded-xl shrink-0">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                            </svg>
                                            {c.phonePrimary}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Historial médico ──────────────────────────── */}
                    {show.medicalHistory && user.medicalHistory.length > 0 && (
                        <section className="bg-white rounded-2xl p-4 border border-[#E4E2DC] shadow-sm">
                            <SectionTitle icon="🏥" label="Historial médico" />
                            <div className="flex flex-col gap-2 mt-3">
                                {user.medicalHistory.map(h => (
                                    <div key={h.id} className="flex items-start gap-3 py-1.5 border-b border-[#F2F1EC] last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-[#1A1512]">{h.eventName}</p>
                                            <div className="flex flex-wrap gap-2 mt-0.5">
                                                {h.eventDate && (
                                                    <span className="text-[11px] text-[#8D99AE]">
                                                        {new Date(h.eventDate).toLocaleDateString("es-CO", { year: "numeric", month: "short" })}
                                                    </span>
                                                )}
                                                {h.location && <span className="text-[11px] text-[#8D99AE]">· {h.location}</span>}
                                                {h.outcome  && <span className="text-[11px] text-[#8D99AE]">· {h.outcome}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Footer ────────────────────────────────────── */}
                    <div className="text-center py-4">
                        <p className="text-[11px] text-[#8D99AE]">
                            Ficha generada por <span className="font-bold text-[#1A1512]">Horus</span> · Red de protección inteligente
                        </p>
                        <p className="text-[10px] text-[#C4BDB7] mt-1">
                            Información actualizada al {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                        </p>
                    </div>
                </main>
            </div>
        </>
    );
}

// ── Sub-componente ────────────────────────────────────────────────────────────

function SectionTitle({ icon, label, light }: { icon: string; label: string; light?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-base">{icon}</span>
            <h2 className={`text-xs font-extrabold uppercase tracking-wide ${light ? "text-white/60" : "text-[#8D99AE]"}`}>
                {label}
            </h2>
        </div>
    );
}

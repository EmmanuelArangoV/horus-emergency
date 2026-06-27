import type { Metadata } from "next";
import FirstAidClient from "./_components/FirstAidClient";
import { CONDITION_PROTOCOL_MAP, ALLERGY_PROTOCOL_MAP } from "@/lib/firstaid/protocols";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "Primeros Auxilios · Horus AID",
    description: "Protocolos de primeros auxilios con búsqueda inteligente",
};

export default async function FirstAidPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string }>;
}) {
    const { from: userId } = await searchParams;

    let suggestedIds: string[] = [];
    let patientName: string | undefined;

    // Si viene desde una ficha médica, cargamos condiciones del paciente
    if (userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    personalInfo:      { select: { firstName: true, lastName: true } },
                    allergies:         { where: { isActive: true }, select: { severity: true } },
                    chronicConditions: { where: { status: "ACTIVE" }, select: { conditionName: true } },
                    privacySettings:   { select: { showFullName: true } },
                },
            });

            if (user) {
                if (user.privacySettings?.showFullName !== false && user.personalInfo) {
                    patientName = `${user.personalInfo.firstName} ${user.personalInfo.lastName}`;
                }

                const ids = new Set<string>();

                // Alergias → anafilaxia
                for (const a of user.allergies) {
                    const mapped = ALLERGY_PROTOCOL_MAP[a.severity] ?? [];
                    mapped.forEach(id => ids.add(id));
                }

                // Condiciones crónicas → protocolos relevantes
                for (const c of user.chronicConditions) {
                    const name = c.conditionName.toLowerCase();
                    for (const [key, protos] of Object.entries(CONDITION_PROTOCOL_MAP)) {
                        if (name.includes(key)) protos.forEach(id => ids.add(id));
                    }
                }

                suggestedIds = [...ids];
            }
        } catch {
            // Silencioso — la página funciona sin contexto de paciente
        }
    }

    return <FirstAidClient suggestedIds={suggestedIds} patientName={patientName} userId={userId} />;
}

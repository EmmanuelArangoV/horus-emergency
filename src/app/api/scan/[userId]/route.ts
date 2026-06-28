import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Expo } from "expo-server-sdk";

const expo = new Expo();

async function sendExpoPush(token: string, title: string, body: string, data?: Record<string, unknown>) {
    if (!Expo.isExpoPushToken(token)) return;
    try {
        await expo.sendPushNotificationsAsync([{
            to: token,
            sound: "default",
            title,
            body,
            data: data ?? {} as Record<string, unknown>,
        }]);
    } catch {
        // Silently ignore push errors — scan was still successful
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? null;

        const [user] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { pushToken: true },
            }),
            prisma.profileScan.create({
                data: {
                    userId,
                    scanType: "QR",
                    scannerIp: ip,
                    accessGranted: true,
                },
            }),
        ]);

        if (user?.pushToken) {
            const scanDate = new Date().toLocaleString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
                timeZone: "America/Bogota",
            });
            await sendExpoPush(
                user.pushToken,
                "Perfil consultado",
                `Tu ID médico fue escaneado el ${scanDate}`,
                { type: "profile_scanned", scanType: "QR" }
            );
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

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
        // Silently ignore — scan was still successful
    }
}

async function sendFcmPush(token: string, title: string, body: string, data?: Record<string, string>) {
    try {
        const { getMessaging } = await import("@/lib/firebase");
        await getMessaging().send({
            token,
            notification: { title, body },
            android: { priority: "high" },
            ...(data ? { data } : {}),
        });
    } catch {
        // Silently ignore FCM errors
    }
}

async function getWatchToken(userId: string): Promise<string | null> {
    try {
        const { getFcmDb } = await import("@/lib/firebase");
        const doc = await getFcmDb().collection("user_tokens").doc(userId).get();
        return doc.exists ? (doc.data()?.watchFcmToken ?? null) : null;
    } catch {
        return null;
    }
}

async function saveNotification(userId: string, title: string, body: string): Promise<void> {
    try {
        const { getDb } = await import("@/lib/firebase");
        const db = getDb();
        const colRef = db.collection("notifications").doc(userId).collection("items");
        await colRef.add({ title, body, type: "qr_scan", read: false, timestamp: new Date() });
        const snap = await colRef.orderBy("timestamp", "desc").get();
        if (snap.size > 10) {
            const batch = db.batch();
            snap.docs.slice(10).forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    } catch {
        // Silently ignore — notification save is best-effort
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

        const scanDate = new Date().toLocaleString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "short",
            timeZone: "America/Bogota",
        });
        const title = "Perfil consultado";
        const body = `Tu ID médico fue escaneado el ${scanDate}`;
        const data: Record<string, string> = { type: "profile_scanned", scanType: "QR" };

        // Phone (Expo)
        if (user?.pushToken) {
            await sendExpoPush(user.pushToken, title, body, data);
        }

        // Watch (FCM via Firestore) + save notification record
        if (process.env.FIREBASE_FCM_JSON && process.env.FIREBASE_FIRESTORE_JSON) {
            const [watchToken] = await Promise.all([
                getWatchToken(userId),
                saveNotification(userId, title, body),
            ]);
            if (watchToken) {
                await sendFcmPush(watchToken, title, body, data);
            }
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

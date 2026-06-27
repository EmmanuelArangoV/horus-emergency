"use client";
import { useEffect } from "react";

export default function ScanLogger({ userId }: { userId: string }) {
    useEffect(() => {
        fetch(`/api/scan/${userId}`, { method: "POST" }).catch(() => {});
    }, [userId]);
    return null;
}

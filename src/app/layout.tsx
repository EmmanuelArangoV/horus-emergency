import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "ID Médico · Horus",
    description: "Ficha médica de emergencia — Red de protección inteligente Horus",
    icons: {
        icon: "/favicon.svg",
        apple: "/favicon.svg",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es" className="h-full antialiased">
            <body className="min-h-full flex flex-col bg-[#F2F1EC]">{children}</body>
        </html>
    );
}

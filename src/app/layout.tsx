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
        <html lang="es">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700&display=swap" rel="stylesheet" />
            </head>
            <body style={{ background: "var(--bg)", minHeight: "100vh" }}>{children}</body>
        </html>
    );
}

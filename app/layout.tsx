import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "../components/AuthGuard";
import NotificationSetup from "./NotificationSetup";
import CapacitorInit from "./CapacitorInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LOGOFF",
  description: "A social app that gets people outside once a day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#18181b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LOGOFF" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <div id="splash" style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "opacity 0.4s ease",
        }}>
          <p style={{ margin: 0, fontSize: "22px", fontWeight: 700, letterSpacing: "0.12em", fontFamily: "Arial, sans-serif" }}>
            LOG<span style={{ color: "#4a7c59" }}>OFF</span>
          </p>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
          window.__dismissSplash = function() {
            var s = document.getElementById('splash');
            if (s && s.style.display !== 'none') {
              s.style.opacity = '0';
              setTimeout(function(){ s.style.display = 'none'; }, 400);
            }
          };
        `}} />
<CapacitorInit />
        <AuthGuard>{children}</AuthGuard>
        <NotificationSetup />
      </body>
    </html>
  );
}

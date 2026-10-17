import "./globals.css";

export const metadata = {
  title: "Gig Worker Companion",
  description: "Track your earnings and payouts, and get help with safety, rights, schemes and complaints.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Both typefaces are exposed as CSS variables so globals.css can wire them to
// --font-sans / --font-serif. The previous setup referenced --font-inter in the
// theme but never defined it (no `variable:` here), so the token resolved to
// nothing and the font only applied by accident via inter.className on <body>.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BELOVI — Admin Dashboard",
  description: "Administration panel for BELOVI.IN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ivory text-ink">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            // react-hot-toast defaults to rounded + shadowed; override to the
            // system's square, hairline-ruled surface.
            style: {
              background: "#faf6ef",
              color: "#1c1a15",
              border: "1px solid #ddd3c2",
              borderRadius: "0px",
              boxShadow: "0 8px 30px rgba(28,26,21,0.10)",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              padding: "12px 16px",
              maxWidth: "420px",
            },
            success: { iconTheme: { primary: "#33432f", secondary: "#faf6ef" } },
            error: { iconTheme: { primary: "#8f4034", secondary: "#faf6ef" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}

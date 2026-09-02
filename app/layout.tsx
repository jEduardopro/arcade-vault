import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono, Courier_Prime } from "next/font/google";
import { Nav } from "@/app/components/nav";
import { SiteFooter } from "@/app/components/site-footer";
import { SessionProvider } from "@/app/lib/session";
import "./globals.css";

// next/font self-hosts these three families under their real names
// ("Press Start 2P", "JetBrains Mono", "Courier Prime"), so globals.css names
// them directly in --pixel / --mono and stays a byte-for-byte port of
// references/templates/styles.css. Importing them here is what emits the
// @font-face rules; the exposed variables are kept for use from Tailwind.

// Display face for every pixel/arcade label (--pixel).
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Body face (--mono).
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Second monospace fallback kept from the reference stack.
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Child routes only set their own name; the suffix comes from the template.
  title: {
    default: "Arcade Vault · Portal Retro",
    template: "%s · Arcade Vault",
  },
  description: "Juega clásicos arcade en línea y compite por la puntuación más alta.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${pressStart.variable} ${jetBrainsMono.variable} ${courierPrime.variable}`}
    >
      <body>
        {/* Fixed atmosphere layers: perspective grid + scanlines, then film grain. */}
        <div className="av-bg" aria-hidden="true" />
        <div className="av-noise" aria-hidden="true" />
        <SessionProvider>
          <div id="root">
            <Nav />
            {children}
            <SiteFooter />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}

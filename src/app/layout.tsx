import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700","800"] });

export const metadata: Metadata = {
  title: "FitLife — AI Nutrition & Fitness Coach",
  description: "Your personal AI-powered nutritionist and fitness coach. Snap meals for instant analysis, get personalized diet plans and workout guides.",
  icons: { icon: "/favicon.ico" },
  metadataBase: new URL("https://fitlife.marcbd.site"),
  openGraph: {
    title: "FitLife — AI Nutrition & Fitness Coach",
    description: "Snap meals for instant AI analysis. Personalized diet plans and workouts.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="theme-color" content="#059669" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: "#064e3b", color: "#fff", borderRadius: "16px", fontSize: "14px", padding: "12px 16px" },
              success: { iconTheme: { primary: "#34d399", secondary: "#064e3b" } },
              error: { iconTheme: { primary: "#f43f5e", secondary: "#fff" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

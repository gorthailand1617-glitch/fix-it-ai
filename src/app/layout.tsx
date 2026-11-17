import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fix it AI — ผู้ช่วยช่างอัจฉริยะสำหรับทุกคน",
  description:
    "เปลี่ยนคนทั่วไปให้กลายเป็นช่างมือโปร วิเคราะห์อาการเสียรถยนต์ เครื่องใช้ไฟฟ้า อิเล็กทรอนิกส์ในบ้าน/สำนักงาน พร้อมแนะนำอะไหล่ | Dev. By Kru.Gorthailand",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoSansThai.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}

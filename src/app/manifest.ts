import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fix it AI — ผู้ช่วยช่างอัจฉริยะสำหรับทุกคน",
    short_name: "Fix it AI",
    description:
      "วิเคราะห์อาการเสียรถยนต์ เครื่องใช้ไฟฟ้า อิเล็กทรอนิกส์ในบ้าน/สำนักงาน พร้อมขั้นตอนตรวจเช็กและสเปกอะไหล่",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#ea580c",
    lang: "th",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}

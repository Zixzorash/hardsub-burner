import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HardSub Burner - เบิร์นซับถาวรฟรี ไม่จำกัดขนาด",
  description: "เบิร์นซับไตเติ้ลลงวิดีโอถาวร รองรับ SRT/VTT/ASS ตั้งค่า FPS ได้",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

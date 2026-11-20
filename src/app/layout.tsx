import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Photo Privacy — Remove GPS metadata with Cloudinary",
  description: "Compare a photo before and after Cloudinary removes its embedded GPS metadata. Download only the bytes that passed verification.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

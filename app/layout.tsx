import type { Metadata } from "next";
import localFont from 'next/font/local'
import "./globals.css";

const gotham = localFont({
  fallback: ['system-ui'],
  src: [
    {
      path: './font/Gotham-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './font/Gotham-LightItalic.otf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './font/Gotham-Book.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './font/Gotham-BookItalic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './font/Gotham-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './font/Gotham-MediumItalic.otf',
      weight: '500',
      style: 'italic',
    },
  ],
})

export const metadata: Metadata = {
  title: "Behind the Song",
  description: "Listening companion for Spotify.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={gotham.className}>{children}</body>
    </html>
  );
}

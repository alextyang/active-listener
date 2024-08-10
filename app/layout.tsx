import type { Metadata } from "next";
import localFont from 'next/font/local'
import "./globals.css";

const gotham = localFont({
  fallback: ['system-ui'],
  src: [
    {
      path: './(lib)/font/Gotham-Thin.otf',
      weight: '200',
      style: 'normal',
    },
    {
      path: './(lib)/font/Gotham-ThinItalic.otf',
      weight: '200',
      style: 'italic',
    },
    {
      path: './(lib)/font/Gotham-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './(lib)/font/Gotham-LightItalic.otf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './(lib)/font/Gotham-Book.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './(lib)/font/Gotham-BookItalic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './(lib)/font/Gotham-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './(lib)/font/Gotham-MediumItalic.otf',
      weight: '500',
      style: 'italic',
    },
  ],
})

export const metadata: Metadata = {
  title: "Active Listener",
  description: "A listening companion for Spotify, summarizing reviews and interviews for the music you love.",
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

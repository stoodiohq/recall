import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recall - Team Memory for AI Coding Assistants',
  description: 'Clone the repo. Know everything. Git-native team memory for Claude Code, Cursor, Codex, and Gemini CLI.',
  openGraph: {
    title: 'Recall - Team Memory for AI Coding Assistants',
    description: 'Clone the repo. Know everything. Git-native team memory for Claude Code, Cursor, Codex, and Gemini CLI.',
    url: 'https://recall.team',
    siteName: 'Recall',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recall - Team Memory for AI Coding Assistants',
    description: 'Clone the repo. Know everything.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

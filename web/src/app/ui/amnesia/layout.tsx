import type { Metadata } from 'next';
import './amnesia.css';

export const metadata: Metadata = {
  title: 'Recall - Team Memory for AI Coding Assistants',
  description: 'Your AI coding assistant remembers what your team has done.',
};

export default function AmnesiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
        rel="stylesheet"
      />
      <div className="amnesia-page">
        <div className="amnesia-noise" aria-hidden="true" />
        {children}
      </div>
    </>
  );
}

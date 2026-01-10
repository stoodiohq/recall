'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-4 text-text-tertiary">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-tertiary max-w-md mb-6">{description}</p>

      {action && (
        action.href ? (
          <a
            href={action.href}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </motion.div>
  );
}

// Pre-built empty states for common scenarios

export function NoReposEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      }
      title="No repositories yet"
      description="Connect your first repository to start building team memory. Your AI coding assistant will automatically sync context."
      action={{
        label: "Connect Repository",
        href: "/app/repos/connect"
      }}
    />
  );
}

export function NoSessionsEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      }
      title="No sessions recorded"
      description="Sessions are automatically saved when team members use their AI coding assistants. Start a coding session to see activity here."
      action={{
        label: "View Install Guide",
        href: "/app/install"
      }}
    />
  );
}

export function NoActivityEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      }
      title="No activity yet"
      description="Team activity will appear here as members save sessions, make decisions, and build context."
    />
  );
}

export function NoTeamMembersEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      }
      title="Invite your team"
      description="Share the invite link to add team members. They'll be able to contribute to team memory and access shared context."
      action={{
        label: "Invite Members",
        href: "/app/team"
      }}
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      title={`No results for "${query}"`}
      description="Try adjusting your search or filters to find what you're looking for."
    />
  );
}

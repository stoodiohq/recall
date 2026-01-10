'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

type Tool = 'claude' | 'cursor' | 'other';

function InstallContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [selectedTool, setSelectedTool] = useState<Tool>('claude');
  const [token, setToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchToken = async () => {
      const authToken = getToken();
      if (!authToken) return;

      try {
        const response = await fetch(`${API_URL}/auth/tokens`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.tokens && data.tokens.length > 0) {
            setToken(data.tokens[0].token);
          }
        }
      } catch (error) {
        console.error('Failed to fetch token:', error);
      }
    };

    if (user) {
      fetchToken();
    }
  }, [user]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleNotify = () => {
    // Would send to backend
    setNotifySubmitted(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-secondary">Install</span>
          </div>
          <a href="/app" className="text-text-tertiary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-text-primary mb-2">Install Recall</h1>
          <p className="text-text-secondary mb-8">Connect your AI coding tools to team memory.</p>

          {/* Tool tabs */}
          <div className="border-b border-border-subtle mb-8">
            <nav className="flex gap-1">
              <button
                onClick={() => setSelectedTool('claude')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedTool === 'claude'
                    ? 'border-cyan-500 text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Claude Code
              </button>
              <button
                onClick={() => setSelectedTool('cursor')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  selectedTool === 'cursor'
                    ? 'border-cyan-500 text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Cursor
                <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">Soon</span>
              </button>
              <button
                onClick={() => setSelectedTool('other')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  selectedTool === 'other'
                    ? 'border-cyan-500 text-text-primary'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                Other
                <span className="px-1.5 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">Soon</span>
              </button>
            </nav>
          </div>

          {/* Claude Code installation */}
          {selectedTool === 'claude' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Step 1 */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">1</span>
                  Add MCP to Claude Code
                </h2>
                <p className="text-text-secondary mb-4">
                  Add this to your <code className="px-1.5 py-0.5 bg-bg-elevated rounded text-cyan-400">~/.claude/claude_desktop_config.json</code>:
                </p>
                <div className="relative">
                  <pre className="bg-bg-elevated border border-border-subtle rounded-lg p-4 overflow-x-auto">
                    <code className="text-sm text-text-secondary">{`{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["-y", "@anthropic/recall-mcp"],
      "env": {
        "RECALL_API_TOKEN": "${token || 'your-token-here'}"
      }
    }
  }
}`}</code>
                  </pre>
                  <button
                    onClick={() => handleCopy(`{
  "mcpServers": {
    "recall": {
      "command": "npx",
      "args": ["-y", "@anthropic/recall-mcp"],
      "env": {
        "RECALL_API_TOKEN": "${token || 'your-token-here'}"
      }
    }
  }
}`, 'config')}
                    className={`absolute top-3 right-3 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      copied === 'config'
                        ? 'bg-green-500 text-white'
                        : 'bg-bg-base text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {copied === 'config' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">2</span>
                  Your API Token
                </h2>
                <p className="text-text-secondary mb-4">
                  Use this token in the config above:
                </p>
                <div className="relative">
                  <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4 flex items-center justify-between">
                    <code className="text-sm text-text-secondary font-mono">
                      {showToken ? token : token?.slice(0, 12) + '...' + (token?.slice(-4) || '')}
                    </code>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="px-3 py-1.5 rounded text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        {showToken ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => token && handleCopy(token, 'token')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          copied === 'token'
                            ? 'bg-green-500 text-white'
                            : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                        }`}
                      >
                        {copied === 'token' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">3</span>
                  Verify Installation
                </h2>
                <p className="text-text-secondary mb-4">
                  Restart Claude Code, then check that Recall is connected:
                </p>
                <div className="relative">
                  <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4 flex items-center justify-between">
                    <code className="text-sm text-cyan-400 font-mono">recall_status</code>
                    <button
                      onClick={() => handleCopy('recall_status', 'verify')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        copied === 'verify'
                          ? 'bg-green-500 text-white'
                          : 'bg-bg-base text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {copied === 'verify' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-text-tertiary text-sm mt-2">
                  You should see your team name and connected repos.
                </p>
              </div>

              {/* Help */}
              <div className="pt-4 border-t border-border-subtle">
                <p className="text-text-tertiary">
                  Need help?{' '}
                  <a href="/docs" className="text-cyan-400 hover:underline">View documentation</a>
                  {' '}or{' '}
                  <a href="mailto:hello@recall.team" className="text-cyan-400 hover:underline">contact support</a>
                </p>
              </div>
            </motion.div>
          )}

          {/* Coming soon for other tools */}
          {(selectedTool === 'cursor' || selectedTool === 'other') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Coming Soon</h3>
              <p className="text-text-secondary mb-6">
                We&apos;re working on {selectedTool === 'cursor' ? 'Cursor' : 'additional tool'} integration.
                Want to be notified when it&apos;s ready?
              </p>

              {!notifySubmitted ? (
                <div className="max-w-sm mx-auto flex gap-2">
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-4 py-2 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleNotify}
                    disabled={!notifyEmail}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50"
                  >
                    Notify Me
                  </button>
                </div>
              ) : (
                <p className="text-green-400 font-medium">
                  We&apos;ll let you know when it&apos;s ready!
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export default function InstallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <InstallContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.recall.team';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  github_username: string | null;
  role: string;
  joined_at: string;
}

interface Invite {
  id: string;
  code: string;
  url: string;
  email: string | null;
  role: string;
  invitedBy: string;
  acceptedBy: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

interface ActivityItem {
  id: string;
  fileType: 'small' | 'medium' | 'large';
  action: 'read' | 'write';
  repoName: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    githubUsername: string | null;
  };
}

interface Team {
  id: string;
  name: string;
  slug: string;
  tier: string;
  seats: number;
  role: string;
  members: TeamMember[];
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function TeamPageContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newInviteUrl, setNewInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchTeamData = async () => {
      const token = getToken();
      if (!token) return;

      try {
        // Fetch team and members
        const teamResponse = await fetch(`${API_URL}/teams/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (teamResponse.ok) {
          const data = await teamResponse.json();
          setTeam(data.team);
        }

        // Fetch invites (may fail if not admin)
        try {
          const invitesResponse = await fetch(`${API_URL}/teams/invites`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (invitesResponse.ok) {
            const data = await invitesResponse.json();
            setInvites(data.invites || []);
          }
        } catch {
          // Not admin, can't see invites
        }

        // Fetch activity
        try {
          const activityResponse = await fetch(`${API_URL}/teams/activity`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (activityResponse.ok) {
            const data = await activityResponse.json();
            setActivity(data.activity || []);
          }
        } catch {
          // Activity fetch failed
        }
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTeamData();
    }
  }, [user]);

  const handleCreateInvite = async () => {
    const token = getToken();
    if (!token) return;

    setCreatingInvite(true);
    try {
      const response = await fetch(`${API_URL}/teams/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setNewInviteUrl(data.url);

        // Refresh invites list
        const invitesResponse = await fetch(`${API_URL}/teams/invites`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (invitesResponse.ok) {
          const invitesData = await invitesResponse.json();
          setInvites(invitesData.invites || []);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create invite');
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
      alert('Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (code: string) => {
    const token = getToken();
    if (!token) return;

    if (!confirm('Are you sure you want to revoke this invite?')) return;

    try {
      const response = await fetch(`${API_URL}/invites/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        setInvites(invites.filter(i => i.code !== code));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to revoke invite');
      }
    } catch (error) {
      console.error('Failed to revoke invite:', error);
    }
  };

  const handleCopyInvite = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (memberId: string, memberName: string, fullDelete: boolean = false) => {
    const token = getToken();
    if (!token) return;

    const action = fullDelete ? 'completely delete' : 'remove';
    if (!confirm(`Are you sure you want to ${action} ${memberName} from the team?${fullDelete ? ' This will delete their entire account.' : ''}`)) return;

    setRemovingMember(memberId);
    try {
      const response = await fetch(`${API_URL}/teams/members/${memberId}?fullDelete=${fullDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        // Refresh team data
        const teamResponse = await fetch(`${API_URL}/teams/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (teamResponse.ok) {
          const data = await teamResponse.json();
          setTeam(data.team);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const isAdmin = team?.role === 'owner' || team?.role === 'admin';
  const isOwner = team?.role === 'owner';
  const pendingInvites = invites.filter(i => i.isActive);
  const usedInvites = invites.filter(i => i.acceptedAt);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !team) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">No team found</p>
          <a href="/app" className="text-cyan-400 hover:underline mt-2 inline-block">Back to dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/app" className="font-semibold text-xl text-text-primary">recall</a>
            <span className="text-text-tertiary">/</span>
            <span className="text-text-secondary">Team</span>
          </div>
          <a href="/app" className="text-text-tertiary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Team Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{team.name}</h1>
            <p className="text-text-secondary mt-1">
              {team.members.length} of {team.seats} seats used
              <span className="mx-2 text-text-tertiary">·</span>
              <span className="capitalize">{team.tier}</span> plan
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleCreateInvite}
              disabled={creatingInvite || team.members.length >= team.seats}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingInvite ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Member
                </>
              )}
            </button>
          )}
        </div>

        {/* New Invite URL Banner */}
        {newInviteUrl && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-green-400 font-medium mb-1">Invite link created!</p>
                <input
                  type="text"
                  readOnly
                  value={newInviteUrl}
                  className="w-full bg-bg-base border border-border-subtle rounded px-3 py-2 text-sm text-text-primary font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyInvite(newInviteUrl)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setNewInviteUrl(null)}
                  className="text-text-tertiary hover:text-text-primary p-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <p className="text-text-tertiary text-xs mt-2">This link expires in 7 days</p>
          </div>
        )}

        {/* Team Members */}
        <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="font-semibold text-text-primary">Team Members</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {team.members.map((member) => (
              <div key={member.id} className="px-5 py-4 flex items-center gap-4">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.name || member.github_username || 'Member'}
                    className="w-10 h-10 rounded-full border border-border-subtle"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center">
                    <span className="text-text-tertiary text-sm">
                      {(member.name || member.email || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary font-medium truncate">
                      {member.name || member.github_username || member.email}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      member.role === 'owner'
                        ? 'bg-purple-500/20 text-purple-400'
                        : member.role === 'admin'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-bg-base text-text-tertiary'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                  <p className="text-text-tertiary text-sm truncate">
                    {member.email}
                    {member.github_username && ` · @${member.github_username}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="flex items-center gap-1.5 text-green-400 text-sm">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    Active
                  </span>
                  <p className="text-text-tertiary text-xs mt-0.5">
                    Joined {getTimeAgo(member.joined_at)}
                  </p>
                </div>
                {isOwner && member.role !== 'owner' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name || member.github_username || member.email, false)}
                      disabled={removingMember === member.id}
                      className="px-3 py-1.5 text-xs text-text-tertiary hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name || member.github_username || member.email, true)}
                      disabled={removingMember === member.id}
                      className="px-3 py-1.5 text-xs text-text-tertiary hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Invites */}
        {isAdmin && pendingInvites.length > 0 && (
          <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">Pending Invites</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium">
                      {invite.email || 'Open invite link'}
                    </p>
                    <p className="text-text-tertiary text-sm">
                      Invited by {invite.invitedBy} · Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyInvite(invite.url)}
                      className="text-cyan-400 hover:text-cyan-300 p-2"
                      title="Copy invite link"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRevokeInvite(invite.code)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Revoke invite"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity / Used Invites */}
        {isAdmin && usedInvites.length > 0 && (
          <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">Invite History</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {usedInvites.slice(0, 5).map((invite) => (
                <div key={invite.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-secondary text-sm">
                      <span className="text-text-primary">{invite.acceptedBy}</span> joined via invite from {invite.invitedBy}
                    </p>
                  </div>
                  <p className="text-text-tertiary text-xs">
                    {getTimeAgo(invite.acceptedAt!)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Activity */}
        {activity.length > 0 && (
          <div className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden mb-8">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="font-semibold text-text-primary">Memory Activity</h2>
            </div>
            <div className="divide-y divide-border-subtle">
              {activity.slice(0, 20).map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                  {item.user.avatarUrl ? (
                    <img
                      src={item.user.avatarUrl}
                      alt={item.user.name || item.user.githubUsername || 'User'}
                      className="w-8 h-8 rounded-full border border-border-subtle"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-bg-base border border-border-subtle flex items-center justify-center">
                      <span className="text-text-tertiary text-xs">
                        {(item.user.name || item.user.githubUsername || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-secondary text-sm">
                      <span className="text-text-primary font-medium">
                        {item.user.name || item.user.githubUsername}
                      </span>
                      {' '}
                      {item.action === 'read' ? 'loaded' : 'updated'}
                      {' '}
                      <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                        item.fileType === 'small'
                          ? 'bg-green-500/20 text-green-400'
                          : item.fileType === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {item.fileType}.md
                      </span>
                      {item.repoName && (
                        <span className="text-text-tertiary"> in {item.repoName}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-text-tertiary text-xs whitespace-nowrap">
                    {getTimeAgo(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seat Info */}
        {team.members.length >= team.seats && (
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-yellow-400 font-medium">All seats are in use</p>
                <p className="text-text-secondary text-sm mt-1">
                  Upgrade your plan to add more team members.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TeamPageContent />
    </Suspense>
  );
}

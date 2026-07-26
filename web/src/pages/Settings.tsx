import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Mail, Check, X, Loader2 } from 'lucide-react';
import { api, type UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [redditUsername, setRedditUsername] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.users.me,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  const updateNameMutation = useMutation({
    mutationFn: () => api.users.updateMe(displayName.trim()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const linkTelegramMutation = useMutation({
    mutationFn: () => api.users.linkTelegram(parseInt(telegramId, 10)),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['profile'] }); setTelegramId(''); },
  });

  const unlinkTelegramMutation = useMutation({
    mutationFn: () => api.users.unlinkTelegram(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const linkRedditMutation = useMutation({
    mutationFn: () => api.users.linkReddit(redditUsername.trim()),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['profile'] }); setRedditUsername(''); },
  });

  const unlinkRedditMutation = useMutation({
    mutationFn: () => api.users.unlinkReddit(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Loading…</div>;

  const channels = (profile as UserProfile | undefined)?.channels;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your profile and notification channels.</p>
      </div>

      {/* Profile */}
      <Section
        title="Profile"
        icon={<div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">P</div>}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={(profile as UserProfile | undefined)?.email ?? ''} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Your login email — cannot be changed here.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">Display Name</Label>
          <p className="text-xs text-muted-foreground">
            Shown publicly next to products you've added to the tracker.
          </p>
          <div className="flex gap-2">
            <Input
              id="display-name"
              placeholder="e.g. TechSavvy"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Button
              onClick={() => updateNameMutation.mutate()}
              disabled={updateNameMutation.isPending || !displayName.trim()}
            >
              {updateNameMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </Button>
          </div>
          {updateNameMutation.isSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1"><Check size={13} /> Saved!</p>
          )}
        </div>
      </Section>

      <Separator />

      {/* Telegram */}
      <Section title="Telegram" icon={<MessageCircle size={18} className="text-blue-500" />}>
        <p className="text-sm text-muted-foreground">
          Get price drop alerts directly in Telegram. Find your numeric ID by messaging{' '}
          <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            @userinfobot
          </a>
          .
        </p>
        {channels?.telegram ? (
          <div className="flex items-center justify-between rounded-lg border bg-green-50 border-green-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                <Check size={14} /> Connected
              </p>
              <p className="text-xs text-green-600">
                ID: {channels.telegram.telegram_id}
                {channels.telegram.username && ` (@${channels.telegram.username})`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50 hover:bg-destructive/10 gap-1"
              onClick={() => unlinkTelegramMutation.mutate()}
              disabled={unlinkTelegramMutation.isPending}
            >
              <X size={12} /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Telegram numeric ID, e.g. 123456789"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
            />
            <Button
              onClick={() => linkTelegramMutation.mutate()}
              disabled={linkTelegramMutation.isPending || !telegramId.trim()}
            >
              {linkTelegramMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Link'}
            </Button>
          </div>
        )}
        {linkTelegramMutation.isError && (
          <p className="text-sm text-destructive">{(linkTelegramMutation.error as Error).message}</p>
        )}
      </Section>

      <Separator />

      {/* Reddit */}
      <Section
        title="Reddit"
        icon={<div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">R</div>}
      >
        <p className="text-sm text-muted-foreground">
          Receive price alerts as Reddit DMs. Enter your Reddit username (without u/).
        </p>
        {channels?.reddit ? (
          <div className="flex items-center justify-between rounded-lg border bg-green-50 border-green-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                <Check size={14} /> Connected
              </p>
              <p className="text-xs text-green-600">u/{channels.reddit.reddit_username}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/50 hover:bg-destructive/10 gap-1"
              onClick={() => unlinkRedditMutation.mutate()}
              disabled={unlinkRedditMutation.isPending}
            >
              <X size={12} /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Reddit username (without u/)"
              value={redditUsername}
              onChange={(e) => setRedditUsername(e.target.value)}
            />
            <Button
              onClick={() => linkRedditMutation.mutate()}
              disabled={linkRedditMutation.isPending || !redditUsername.trim()}
            >
              {linkRedditMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Link'}
            </Button>
          </div>
        )}
        {linkRedditMutation.isError && (
          <p className="text-sm text-destructive">{(linkRedditMutation.error as Error).message}</p>
        )}
      </Section>

      <Separator />

      {/* Email (future) */}
      <Section title="Email" icon={<Mail size={18} className="text-muted-foreground" />}>
        <p className="text-sm text-muted-foreground">
          Email notifications are coming soon. We'll use your account email ({(profile as UserProfile | undefined)?.email ?? '—'}).
        </p>
        <Button disabled variant="outline">Coming soon</Button>
      </Section>
    </div>
  );
}

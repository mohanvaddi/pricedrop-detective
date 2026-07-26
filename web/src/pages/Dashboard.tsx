import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Package, Bell, Trash2, Pencil } from 'lucide-react';
import { api, type TrackerEntry } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge } from '@/components/PlatformBadge';
import { AlertConfigModal } from '@/components/AlertConfigModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function ThumbnailCell({ entry }: { entry: TrackerEntry }) {
  const [err, setErr] = useState(false);
  if ((entry.product as { thumbnail_url?: string | null }).thumbnail_url && !err) {
    return (
      <img
        src={(entry.product as { thumbnail_url: string }).thumbnail_url}
        alt={entry.product.title ?? 'product'}
        className="w-10 h-10 object-contain rounded-md border bg-white"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center">
      <Package size={16} className="text-muted-foreground" />
    </div>
  );
}

function TrackerRow({
  entry,
  onDelete,
  onEditAlert,
}: {
  entry: TrackerEntry;
  onDelete: (id: string) => void;
  onEditAlert: (entry: TrackerEntry) => void;
}) {
  const { product, subscription } = entry;
  return (
    <tr className="border-t hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <ThumbnailCell entry={entry} />
      </td>
      <td className="px-4 py-3">
        <Link
          to={'/product/' + product.id}
          className="font-medium text-sm hover:underline block max-w-[200px] truncate"
        >
          {product.title ?? product.url}
        </Link>
        <span className="text-xs text-muted-foreground font-mono">{product.id}</span>
      </td>
      <td className="px-4 py-3">
        <PlatformBadge website={product.website} />
      </td>
      <td className="px-4 py-3 text-sm">
        {subscription.notify_every_change ? (
          <span className="text-muted-foreground flex items-center gap-1">
            <Bell size={12} /> Every change
          </span>
        ) : subscription.alert_price != null ? (
          <span className="text-primary font-medium">{fmt(subscription.alert_price)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditAlert(entry)}>
                <Pencil size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit alert</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ExternalLink size={14} />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>Visit product site</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(product.id)}
              >
                <Trash2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove tracker</TooltipContent>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [addAlertOpen, setAddAlertOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');
  const [editTarget, setEditTarget] = useState<TrackerEntry | null>(null);

  const { data: trackers, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: api.subscriptions.list,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: ({ alertPrice, notifyEveryChange }: { alertPrice: number | null; notifyEveryChange: boolean }) =>
      api.subscriptions.create(pendingUrl, alertPrice ?? undefined, notifyEveryChange),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setUrl('');
      setPendingUrl('');
      setAddAlertOpen(false);
      setAddError('');
    },
    onError: (e: Error) => { setAddError(e.message); setAddAlertOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => api.subscriptions.delete(productId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const alertMutation = useMutation({
    mutationFn: ({ id, alertPrice, notifyEveryChange }: { id: string; alertPrice: number | null; notifyEveryChange: boolean }) =>
      api.subscriptions.updateAlert(id, alertPrice, notifyEveryChange),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setEditTarget(null);
    },
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setPendingUrl(url.trim());
    setAddAlertOpen(true);
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Trackers</h1>
        <p className="text-muted-foreground text-sm">Manage products you are tracking and configure your alerts.</p>
      </div>

      <form onSubmit={handleUrlSubmit} className="flex gap-2 max-w-xl">
        <Input
          placeholder="Paste an Amazon, Flipkart, or Myntra URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="submit">Track</Button>
      </form>
      {addError && <p className="text-sm text-destructive">{addError}</p>}

      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-14"></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Platform</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Alert Setting</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : trackers?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    No trackers yet. Paste a URL above to get started.
                  </td>
                </tr>
              ) : (
                trackers?.map((entry) => (
                  <TrackerRow
                    key={entry.product.id}
                    entry={entry}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onEditAlert={(e) => setEditTarget(e)}
                  />
                ))
              )}
          </tbody>
        </table>
      </div>

      {/* Add tracker alert config modal */}
      <AlertConfigModal
        open={addAlertOpen}
        onOpenChange={setAddAlertOpen}
        title="Set up your alert"
        onSave={(alertPrice, notifyEveryChange) => addMutation.mutate({ alertPrice, notifyEveryChange })}
        isLoading={addMutation.isPending}
      />

      {/* Edit alert modal */}
      {editTarget && (
        <AlertConfigModal
          open={Boolean(editTarget)}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          title="Edit Alert"
          initialAlertPrice={editTarget.subscription.alert_price}
          initialNotifyEveryChange={editTarget.subscription.notify_every_change}
          onSave={(alertPrice, notifyEveryChange) =>
            alertMutation.mutate({ id: editTarget.product.id, alertPrice, notifyEveryChange })
          }
          isLoading={alertMutation.isPending}
        />
      )}
    </div>
    </TooltipProvider>
  );
}

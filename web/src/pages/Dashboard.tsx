import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TrackerEntry } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function TrackerCard({ entry, onDelete }: { entry: TrackerEntry; onDelete: (id: string) => void }) {
  const { product, subscription } = entry;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2">
            <Link to={`/product/${product.id}`} className="hover:underline">
              {product.title ?? product.url}
            </Link>
          </CardTitle>
          <Button variant="destructive" size="sm" onClick={() => onDelete(product.id)}>Remove</Button>
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2 flex-wrap text-sm">
        <Badge variant="secondary" className="capitalize">{product.website}</Badge>
        {subscription.alert_price && (
          <span className="text-muted-foreground">🎯 Alert: ₹{subscription.alert_price.toLocaleString()}</span>
        )}
        <span className="text-xs text-muted-foreground">ID: {product.id}</span>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, logout } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [addError, setAddError] = useState('');

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const { data: trackers, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: api.subscriptions.list,
  });

  const addMutation = useMutation({
    mutationFn: (u: string) => api.subscriptions.create(u),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); setUrl(''); setAddError(''); },
    onError: (e: Error) => setAddError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => api.subscriptions.delete(productId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); },
  });

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    addMutation.mutate(url.trim());
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Trackers</h1>
        <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
      </div>

      <form onSubmit={(e) => { void handleAdd(e); }} className="flex gap-2">
        <Input
          placeholder="Paste an Amazon or Flipkart URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Adding…' : 'Track'}
        </Button>
      </form>
      {addError && <p className="text-sm text-destructive">{addError}</p>}

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {trackers?.length === 0 && (
        <p className="text-muted-foreground text-center py-10">No trackers yet. Paste a URL above to get started.</p>
      )}
      <div className="space-y-3">
        {trackers?.map((entry) => (
          <TrackerCard
            key={entry.product.id}
            entry={entry}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}

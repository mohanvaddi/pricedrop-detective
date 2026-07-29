import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Package, Bell, CheckCircle2, Lock } from 'lucide-react';
import { api, type PublicListProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreBadge } from '@/components/StoreBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertConfigModal } from '@/components/AlertConfigModal';

function ThumbnailCell({ product }: { product: PublicListProduct }) {
  const [err, setErr] = useState(false);
  if (product.thumbnailUrl && !err) {
    return (
      <img
        src={product.thumbnailUrl}
        alt={product.title ?? 'product'}
        className="w-12 h-12 object-contain rounded-md border bg-white"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-md border bg-muted flex items-center justify-center shrink-0">
      <Package size={20} className="text-muted-foreground" />
    </div>
  );
}

function PriceCell({ label, price, comparePrice }: { label: string; price: number | null; comparePrice?: number | null }) {
  if (price == null) return <span className="text-muted-foreground text-xs">—</span>;
  let color = '';
  let diff: string | null = null;
  if (comparePrice != null && comparePrice !== price) {
    const pct = ((price - comparePrice) / comparePrice) * 100;
    if (price < comparePrice) {
      color = 'text-green-600 font-semibold';
      diff = `(${pct.toFixed(1)}%)`;
    } else {
      color = 'text-red-500 font-semibold';
      diff = `(+${pct.toFixed(1)}%)`;
    }
  }
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className={`text-sm ${color}`}>
        ₹{price.toLocaleString('en-IN')}
        {diff && <span className={`ml-1 text-xs ${color}`}>{diff}</span>}
      </span>
    </div>
  );
}

export default function SharedListPage() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [globalFilter, setGlobalFilter] = useState('');
  const [subscribeTarget, setSubscribeTarget] = useState<PublicListProduct | null>(null);

  const { data: listData, isLoading, error } = useQuery({
    queryKey: ['public-list', listId],
    queryFn: () => api.lists.getPublic(listId!),
    enabled: !!listId,
  });

  const { data: mySubscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.subscriptions.list(),
    enabled: isAuthenticated,
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: api.lists.list,
    enabled: isAuthenticated,
  });

  const subscribedIds = useMemo(
    () => new Set(mySubscriptions?.map((s) => s.product.id) ?? []),
    [mySubscriptions],
  );

  const subscribeMutation = useMutation({
    mutationFn: ({ url, alertPrice, notifyEveryChange, listId: targetListId }: { url: string; alertPrice: number | null; notifyEveryChange: boolean; listId?: string }) =>
      api.subscriptions.create(url, alertPrice ?? undefined, notifyEveryChange, targetListId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      setSubscribeTarget(null);
    },
  });

  const filteredProducts = useMemo(() => {
    if (!listData?.products) return [];
    if (!globalFilter) return listData.products;
    const q = globalFilter.toLowerCase();
    return listData.products.filter(
      (p) =>
        (p.title ?? '').toLowerCase().includes(q) ||
        p.website.toLowerCase().includes(q),
    );
  }, [listData, globalFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !listData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Lock size={48} className="text-muted-foreground" />
        <h1 className="text-2xl font-bold">List not found</h1>
        <p className="text-muted-foreground text-center max-w-md">
          This list doesn't exist or is private. If you believe this is an error, contact the list owner.
        </p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{listData.name}</h1>
            <p className="text-muted-foreground text-sm">
              {listData.ownerName ? `Shared by ${listData.ownerName}` : 'Shared list'} · {listData.products.length} product{listData.products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Input
            placeholder="Search products…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="sm:w-72"
          />
        </div>

        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground w-14"></th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">Product</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">Store</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">ATL</th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground w-32"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    No products in this list.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isSubscribed = subscribedIds.has(product.id);
                  return (
                    <tr
                      key={product.id}
                      className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate('/product/' + product.id)}
                    >
                      <td className="px-3 py-3">
                        <ThumbnailCell product={product} />
                      </td>
                      <td className="px-3 py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block max-w-[250px] truncate font-medium">
                              {product.title ?? product.url}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{product.title ?? product.url}</TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-3">
                        <StoreBadge website={product.website} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <PriceCell label="Initial" price={product.initialPrice} />
                          <PriceCell label="Current" price={product.currentPrice} comparePrice={product.initialPrice} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">All-time low</span>
                          <span className="text-sm text-green-600 font-medium">
                            {product.allTimeLow != null ? '₹' + product.allTimeLow.toLocaleString('en-IN') : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a href={product.url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ExternalLink size={14} />
                                </Button>
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Visit product page</TooltipContent>
                          </Tooltip>
                          {isAuthenticated ? (
                            isSubscribed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                                <CheckCircle2 size={11} /> Tracking
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setSubscribeTarget(product)}
                              >
                                <Bell size={11} /> Track
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() => navigate('/register')}
                            >
                              <Bell size={11} /> Sign up to track
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {subscribeTarget && (
        <AlertConfigModal
          open={Boolean(subscribeTarget)}
          onOpenChange={(open) => { if (!open) setSubscribeTarget(null); }}
          title={'Track: ' + (subscribeTarget.title?.slice(0, 50) ?? 'this product')}
          lists={lists}
          onSave={(alertPrice, notifyEveryChange, selectedListId) =>
            subscribeMutation.mutate({ url: subscribeTarget.url, alertPrice, notifyEveryChange, listId: selectedListId })
          }
          isLoading={subscribeMutation.isPending}
        />
      )}
    </TooltipProvider>
  );
}

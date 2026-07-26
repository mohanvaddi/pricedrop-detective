import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { ExternalLink, Package, TrendingDown, TrendingUp, Minus, Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlatformBadge } from '@/components/PlatformBadge';
import { AlertConfigModal } from '@/components/AlertConfigModal';

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function PriceStat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1 text-center shadow-sm">
      <div className={`text-xl font-bold ${highlight ?? ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [alertOpen, setAlertOpen] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.get(id!),
    enabled: Boolean(id),
  });

  const { data: prices } = useQuery({
    queryKey: ['prices', id],
    queryFn: () => api.products.prices(id!),
    enabled: Boolean(id),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: api.subscriptions.list,
    enabled: isAuthenticated,
  });

  const mySubscription = subscriptions?.find((s) => s.product.id === id)?.subscription;

  const subscribeMutation = useMutation({
    mutationFn: ({ alertPrice, notifyEveryChange }: { alertPrice: number | null; notifyEveryChange: boolean }) =>
      api.subscriptions.create(product!.url, alertPrice ?? undefined, notifyEveryChange),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setAlertOpen(false);
    },
  });

  const alertMutation = useMutation({
    mutationFn: ({ alertPrice, notifyEveryChange }: { alertPrice: number | null; notifyEveryChange: boolean }) =>
      api.subscriptions.updateAlert(id!, alertPrice, notifyEveryChange),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setAlertOpen(false);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: () => api.subscriptions.delete(id!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  if (productLoading) return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  if (!product) return <div className="text-center py-20 text-destructive">Product not found.</div>;

  const chartData = prices?.map((p) => ({
    date: new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    price: p.price,
    fullDate: new Date(p.created_at).toLocaleString('en-IN'),
  }));

  const latestPrice = prices?.[prices.length - 1]?.price ?? null;
  const initialPrice = prices?.[0]?.price ?? null;
  const allTimeLow = prices ? Math.min(...prices.map((p) => p.price)) : null;
  const lastChecked = prices?.[prices.length - 1]?.created_at;

  let priceDelta = null;
  let DeltaIcon = Minus;
  let deltaColor = 'text-muted-foreground';
  if (latestPrice != null && initialPrice != null && initialPrice !== 0) {
    const pct = ((latestPrice - initialPrice) / initialPrice) * 100;
    priceDelta = pct.toFixed(1);
    if (pct < 0) { DeltaIcon = TrendingDown; deltaColor = 'text-green-600'; }
    else if (pct > 0) { DeltaIcon = TrendingUp; deltaColor = 'text-red-500'; }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex gap-6 items-start">
        {product.thumbnail_url && !imgErr ? (
          <img
            src={product.thumbnail_url}
            alt={product.title ?? 'product'}
            className="w-24 h-24 object-contain rounded-xl border bg-white shrink-0"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-24 h-24 rounded-xl border bg-muted flex items-center justify-center shrink-0">
            <Package size={32} className="text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-2xl font-bold leading-snug">{product.title ?? 'Unknown Product'}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <PlatformBadge website={product.website} />
            {latestPrice != null && (
              <span className="text-2xl font-semibold">{fmt(latestPrice)}</span>
            )}
            {priceDelta != null && (
              <span className={`flex items-center gap-1 text-sm font-medium ${deltaColor}`}>
                <DeltaIcon size={14} />
                {Math.abs(Number(priceDelta))}% since tracking
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="gap-2">
                <ExternalLink size={14} /> View on {product.website.charAt(0).toUpperCase() + product.website.slice(1)}
              </Button>
            </a>
            {isAuthenticated && (
              mySubscription ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setAlertOpen(true)}>
                    <Bell size={13} /> Edit Alert
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => unsubscribeMutation.mutate()}
                    disabled={unsubscribeMutation.isPending}
                  >
                    Untrack
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setAlertOpen(true)}>
                  <Bell size={13} /> Track this product
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <PriceStat label="Initial Price" value={initialPrice != null ? fmt(initialPrice) : '—'} />
        <PriceStat label="Current Price" value={latestPrice != null ? fmt(latestPrice) : '—'} />
        <PriceStat
          label="All-time Low"
          value={allTimeLow != null ? fmt(allTimeLow) : '—'}
          highlight="text-green-600"
        />
        <PriceStat
          label="Change"
          value={priceDelta != null ? (Number(priceDelta) >= 0 ? '+' : '') + priceDelta + '%' : '—'}
          highlight={deltaColor}
        />
      </div>

      {/* Price chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Price History</CardTitle>
          {lastChecked && (
            <span className="text-xs text-muted-foreground">
              Last checked: {new Date(lastChecked).toLocaleString('en-IN')}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {chartData && chartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => '₹' + (v / 1000).toFixed(0) + 'k'}
                  width={60}
                />
                <Tooltip
                  formatter={(v) => [fmt(Number(v)), 'Price']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#priceGrad)"
                  dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">
              Not enough data to display a chart yet. Check back after the next price check.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Login prompt for unauthenticated */}
      {!isAuthenticated && (
        <div className="rounded-xl border bg-muted/30 p-6 text-center space-y-3">
          <p className="font-medium">Want to track this product?</p>
          <p className="text-sm text-muted-foreground">Sign in to get price drop alerts via Telegram, Reddit, or email.</p>
          <div className="flex justify-center gap-3">
            <Link to="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Get started free</Button></Link>
          </div>
        </div>
      )}

      {/* Alert modal */}
      <AlertConfigModal
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title={mySubscription ? 'Edit Alert' : 'Track this product'}
        initialAlertPrice={mySubscription?.alert_price}
        initialNotifyEveryChange={mySubscription?.notify_every_change ?? true}
        onSave={(alertPrice, notifyEveryChange) => {
          if (mySubscription) {
            alertMutation.mutate({ alertPrice, notifyEveryChange });
          } else {
            subscribeMutation.mutate({ alertPrice, notifyEveryChange });
          }
        }}
        isLoading={subscribeMutation.isPending || alertMutation.isPending}
      />
    </div>
  );
}

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();

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

  if (productLoading) return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  if (!product) return <div className="text-center py-20 text-destructive">Product not found.</div>;

  const chartData = prices?.map((p) => ({
    date: new Date(p.created_at).toLocaleDateString(),
    price: p.price,
  }));

  const latestPrice = prices?.[prices.length - 1]?.price;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">{product.title ?? 'Unknown Product'}</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="capitalize">{product.website}</Badge>
          {latestPrice && <span className="text-xl font-semibold">₹{latestPrice.toLocaleString()}</span>}
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
            View on {product.website}
          </a>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Price History</CardTitle></CardHeader>
        <CardContent>
          {chartData && chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${v.toLocaleString()}`} width={80} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Price']} />
                <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">Not enough data to display a chart yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

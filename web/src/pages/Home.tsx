import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, type Product } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={`/product/${product.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base line-clamp-2">
            {product.title ?? product.url}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className="capitalize">{product.website}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  });

  if (isLoading) return <div className="text-center py-20 text-muted-foreground">Loading products…</div>;
  if (error) return <div className="text-center py-20 text-destructive">Failed to load products.</div>;
  if (!products?.length) return (
    <div className="text-center py-20 text-muted-foreground">
      No products are being tracked yet.
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tracked Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}

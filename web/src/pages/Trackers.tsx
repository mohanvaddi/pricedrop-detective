import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, Package, Trophy, Bell, CheckCircle2 } from 'lucide-react';
import { api, type EnrichedProduct } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertConfigModal } from '@/components/AlertConfigModal';

const col = createColumnHelper<EnrichedProduct & { _rank: number }>();

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (!isSorted) return <ChevronsUpDown size={14} className="text-muted-foreground/50" />;
  return isSorted === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
}

function ThumbnailCell({ product }: { product: EnrichedProduct }) {
  const [err, setErr] = useState(false);
  if (product.thumbnail_url && !err) {
    return (
      <img
        key={product.id}
        src={product.thumbnail_url}
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

function RankBadge({ rank, score }: { rank: number; score: number }) {
  const color =
    rank === 1 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
    rank === 2 ? 'bg-gray-100 text-gray-600 border-gray-300' :
    rank === 3 ? 'bg-orange-50 text-orange-600 border-orange-300' :
    'bg-muted text-muted-foreground border-border';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold cursor-default ${color}`}>
          {rank <= 3 && <Trophy size={10} />}#{rank}
        </span>
      </TooltipTrigger>
      <TooltipContent>Rank score: {score} (views + subscribers×2)</TooltipContent>
    </Tooltip>
  );
}

function PriceCell({ label, price, comparePrice }: { label: string; price: number | null | undefined; comparePrice?: number | null }) {
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

export default function TrackersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rank_score', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [subscribeTarget, setSubscribeTarget] = useState<EnrichedProduct | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  });

  const { data: mySubscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: api.subscriptions.list,
    enabled: isAuthenticated,
  });

  const subscribedIds = useMemo(
    () => new Set(mySubscriptions?.map((s) => s.product.id) ?? []),
    [mySubscriptions],
  );

  const subscribeMutation = useMutation({
    mutationFn: ({ url, alertPrice, notifyEveryChange }: { url: string; alertPrice: number | null; notifyEveryChange: boolean }) =>
      api.subscriptions.create(url, alertPrice ?? undefined, notifyEveryChange),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setSubscribeTarget(null);
    },
  });

  const rankedProducts = useMemo(() => {
    if (!products) return [];
    const sorted = [...products].sort((a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0));
    return sorted.map((p, i) => ({ ...p, _rank: i + 1 }));
  }, [products]);

  const columns = useMemo(
    () => [
      col.display({
        id: 'thumbnail',
        header: '',
        cell: ({ row }) => <ThumbnailCell product={row.original} />,
        enableSorting: false,
      }),
      col.accessor('title', {
        header: 'Product',
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[200px] truncate text-sm font-medium cursor-default">
                {row.original.title ?? row.original.url}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{row.original.title ?? row.original.url}</TooltipContent>
          </Tooltip>
        ),
      }),
      col.accessor('id', {
        header: 'ID',
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">{getValue()}</span>
        ),
        enableSorting: false,
      }),
      col.accessor('rank_score', {
        header: 'Rank',
        cell: ({ row }) => <RankBadge rank={row.original._rank} score={row.original.rank_score ?? 0} />,
      }),
      col.display({
        id: 'prices',
        header: 'Price',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <PriceCell label="Initial" price={row.original.initial_price} />
            <PriceCell label="Current" price={row.original.current_price} comparePrice={row.original.initial_price} />
          </div>
        ),
        enableSorting: false,
      }),
      col.accessor('all_time_low', {
        header: 'ATL',
        cell: ({ getValue }) => (
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">All-time low</span>
            <span className="text-sm text-green-600 font-medium">
              {getValue() != null ? '₹' + (getValue() as number).toLocaleString('en-IN') : '—'}
            </span>
          </div>
        ),
      }),
      col.accessor('added_by', {
        header: 'Added by',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() ?? 'Anonymous'}</span>
        ),
      }),
      col.accessor('website', {
        header: 'Platform',
        cell: ({ getValue }) => <PlatformBadge website={getValue()} />,
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const isSubscribed = subscribedIds.has(row.original.id);
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={row.original.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink size={14} />
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>Visit product page</TooltipContent>
              </Tooltip>
              {isAuthenticated && (
                isSubscribed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium border border-green-200 cursor-default">
                        <CheckCircle2 size={11} /> Tracking
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>You are already tracking this product</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setSubscribeTarget(row.original)}
                      >
                        <Bell size={11} /> Subscribe
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Track this product and set a price alert</TooltipContent>
                  </Tooltip>
                )
              )}
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    [isAuthenticated, subscribedIds],
  );

  const table = useReactTable({
    data: rankedProducts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
    globalFilterFn: (row, _id, value: string) => {
      const q = value.toLowerCase();
      return (
        (row.original.title ?? '').toLowerCase().includes(q) ||
        row.original.website.toLowerCase().includes(q) ||
        row.original.id.toLowerCase().includes(q) ||
        (row.original.added_by ?? '').toLowerCase().includes(q)
      );
    },
  });

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">All Tracked Products</h1>
            <p className="text-muted-foreground text-sm">{rankedProducts.length} products being tracked</p>
          </div>
          <Input
            placeholder="Search by name, platform, or user…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="sm:w-72"
          />
        </div>

        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <SortIcon isSorted={header.column.getIsSorted()} />
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate('/product/' + row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} — {table.getFilteredRowModel().rows.length} results
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Subscribe modal */}
      {subscribeTarget && (
        <AlertConfigModal
          open={Boolean(subscribeTarget)}
          onOpenChange={(open) => { if (!open) setSubscribeTarget(null); }}
          title={'Track: ' + (subscribeTarget.title?.slice(0, 50) ?? 'this product')}
          onSave={(alertPrice, notifyEveryChange) =>
            subscribeMutation.mutate({ url: subscribeTarget.url, alertPrice, notifyEveryChange })
          }
          isLoading={subscribeMutation.isPending}
        />
      )}
    </TooltipProvider>
  );
}

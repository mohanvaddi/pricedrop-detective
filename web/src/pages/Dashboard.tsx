import { useState, useMemo, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
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
import { ExternalLink, Package, Bell, Trash2, Pencil, ChevronUp, ChevronDown, ChevronsUpDown, Globe, Share2, Check } from 'lucide-react';
import { api, type TrackerEntry } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StoreBadge } from '@/components/StoreBadge';
import { AlertConfigModal } from '@/components/AlertConfigModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StoreDrawer } from '@/components/StoreDrawer';
import { ListSidebar, type ListFilter } from '@/components/ListSidebar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const col = createColumnHelper<TrackerEntry>();

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN'); }

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (!isSorted) return <ChevronsUpDown size={13} className="text-muted-foreground/50" />;
  return isSorted === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
}

function ThumbnailCell({ entry }: { entry: TrackerEntry }) {
  const [err, setErr] = useState(false);
  const url = entry.product.thumbnailUrl;
  if (url && !err) {
    return (
      <img
        key={entry.product.id}
        src={url}
        alt={entry.product.title ?? 'product'}
        className="w-10 h-10 object-contain rounded-md border bg-white"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
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

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [addAlertOpen, setAddAlertOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');
  const [editTarget, setEditTarget] = useState<TrackerEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrackerEntry | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeList, setActiveList] = useState<ListFilter>('all');
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch all subscriptions (for total count in sidebar)
  const { data: allTrackers } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.subscriptions.list(),
    enabled: isAuthenticated,
  });

  // Fetch filtered subscriptions based on active list
  const { data: trackers, isLoading } = useQuery({
    queryKey: ['subscriptions', activeList],
    queryFn: () => api.subscriptions.list(activeList === 'all' ? undefined : activeList),
    enabled: isAuthenticated,
  });

  // Fetch user lists for the alert modal dropdown
  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: api.lists.list,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: ({ alertPrice, notifyEveryChange, listId }: { alertPrice: number | null; notifyEveryChange: boolean; listId?: string }) =>
      api.subscriptions.create(pendingUrl, alertPrice ?? undefined, notifyEveryChange, listId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      setUrl(''); setPendingUrl(''); setAddAlertOpen(false); setAddError('');
    },
    onError: (e: Error) => { setAddError(e.message); setAddAlertOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => api.subscriptions.delete(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  const alertMutation = useMutation({
    mutationFn: ({ id, alertPrice, notifyEveryChange, listId }: { id: string; alertPrice: number | null; notifyEveryChange: boolean; listId?: string | null }) =>
      api.subscriptions.updateAlert(id, alertPrice, notifyEveryChange, listId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      setEditTarget(null);
    },
  });

  const columns = useMemo(() => [
    col.display({
      id: 'thumbnail',
      header: '',
      cell: ({ row }) => <ThumbnailCell entry={row.original} />,
      enableSorting: false,
    }),
    col.accessor('product.title', {
      id: 'title',
      header: 'Product',
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={'/product/' + row.original.product.id}
              className="font-medium text-sm hover:underline block max-w-[220px] truncate"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {row.original.product.title ?? row.original.product.url}
            </Link>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{row.original.product.title ?? row.original.product.url}</TooltipContent>
        </Tooltip>
      ),
    }),
    col.accessor('product.website', {
      id: 'platform',
      header: 'Store',
      cell: ({ getValue }) => <StoreBadge website={getValue()} />,
    }),
    col.display({
      id: 'alert',
      header: 'Alert Setting',
      cell: ({ row }) => {
        const { subscription } = row.original;
        if (subscription.notifyEveryChange) {
          return <span className="text-muted-foreground text-sm flex items-center gap-1"><Bell size={12} /> Every change</span>;
        }
        if (subscription.alertPrice != null) {
          return <span className="text-primary font-medium text-sm">{fmt(subscription.alertPrice)}</span>;
        }
        return <span className="text-muted-foreground">—</span>;
      },
      enableSorting: false,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(row.original)}>
                <Pencil size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit alert</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={row.original.product.url} target="_blank" rel="noopener noreferrer">
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
                variant="ghost" size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove tracker</TooltipContent>
          </Tooltip>
        </div>
      ),
      enableSorting: false,
    }),
  ], [deleteMutation]);

  const table = useReactTable({
    data: trackers ?? [],
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
        (row.original.product.title ?? '').toLowerCase().includes(q) ||
        row.original.product.website.toLowerCase().includes(q) ||
        row.original.product.id.toLowerCase().includes(q)
      );
    },
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setPendingUrl(url.trim());
    setAddAlertOpen(true);
  }

  // Determine heading based on active list
  const activeListObj = lists.find((l) => l.id === activeList);
  const heading = activeList === 'all'
    ? 'All Products'
    : activeList === 'unlisted'
      ? 'Unlisted'
      : activeListObj?.name ?? 'My Trackers';
  const isCustomList = activeList !== 'all' && activeList !== 'unlisted' && !!activeListObj;

  return (
    <TooltipProvider>
      <div className="flex gap-6">
        <ListSidebar
          activeList={activeList}
          onSelectList={setActiveList}
          totalCount={allTrackers?.length ?? 0}
        />

        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{heading}</h1>
              {isCustomList && activeListObj.isPublic && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/dashboard/${activeListObj.id}`;
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    });
                  }}
                >
                  {linkCopied ? <><Check size={13} /> Copied!</> : <><Share2 size={13} /> Share</>}
                </Button>
              )}
            </div>
            <p className="text-muted-foreground text-sm">Manage products you are tracking and configure your alerts.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <form onSubmit={handleUrlSubmit} className="flex gap-2 w-full sm:max-w-xl">
              <Input
                placeholder="Paste an Amazon, Flipkart, or Myntra URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 input-highlight"
              />
              <Button type="submit">Track</Button>
            </form>
            <div className="flex gap-2 items-center">
              <StoreDrawer>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                  <Globe size={14} />
                  Stores
                </Button>
              </StoreDrawer>
              <Input
                placeholder="Search…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="sm:w-56"
              />
            </div>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}

          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && <SortIcon isSorted={header.column.getIsSorted()} />}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-t">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-16 text-muted-foreground">
                        {(trackers?.length ?? 0) === 0
                          ? 'No trackers yet. Paste a URL above to get started.'
                          : 'No results match your search.'}
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-muted/20 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
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
          {(trackers?.length ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())} — {table.getFilteredRowModel().rows.length} results
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertConfigModal
        open={addAlertOpen}
        onOpenChange={setAddAlertOpen}
        title="Set up your alert"
        lists={lists}
        onSave={(alertPrice, notifyEveryChange, listId) => addMutation.mutate({ alertPrice, notifyEveryChange, listId })}
        isLoading={addMutation.isPending}
      />

      {editTarget && (
        <AlertConfigModal
          open={Boolean(editTarget)}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
          title="Edit Alert"
          lists={lists}
          initialAlertPrice={editTarget.subscription.alertPrice}
          initialNotifyEveryChange={editTarget.subscription.notifyEveryChange}
          onSave={(alertPrice, notifyEveryChange, listId) =>
            alertMutation.mutate({ id: editTarget.product.id, alertPrice, notifyEveryChange, listId })
          }
          isLoading={alertMutation.isPending}
        />
      )}

      {deleteTarget && (
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <DialogContent className="sm:max-w-sm !duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none">
            <DialogHeader>
              <DialogTitle>Remove tracker?</DialogTitle>
              <DialogDescription>
                Stop tracking "{deleteTarget.product.title ?? deleteTarget.product.url}"? You can always re-add it later.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { deleteMutation.mutate(deleteTarget.product.id); setDeleteTarget(null); }}>
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}

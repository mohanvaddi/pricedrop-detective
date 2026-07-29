import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { List, Plus, Pencil, Trash2, Package, InboxIcon, Menu } from 'lucide-react';
import { api, type UserList } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateListPopover } from './CreateListPopover';
import { RenameListPopover } from './RenameListPopover';
import { DeleteListConfirm } from './DeleteListConfirm';

const MAX_CUSTOM_LISTS = 3;

export type ListFilter = 'all' | 'unlisted' | string;

interface ListSidebarProps {
  activeList: ListFilter;
  onSelectList: (listId: ListFilter) => void;
  totalCount: number;
}

export function ListSidebar({ activeList, onSelectList, totalCount }: ListSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: lists = [] } = useQuery({
    queryKey: ['lists'],
    queryFn: api.lists.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.lists.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      onSelectList('all');
    },
  });

  const unlistedCount = totalCount - lists.reduce((sum, l) => sum + l.itemCount, 0);
  const atLimit = lists.length >= MAX_CUSTOM_LISTS;

  const sidebarContent = (
    <nav className="flex flex-col gap-1 p-3 h-full">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">Lists</p>

      {/* All Products */}
      <SidebarItem
        active={activeList === 'all'}
        onClick={() => { onSelectList('all'); setMobileOpen(false); }}
        icon={<Package size={15} />}
        label="All Products"
        count={totalCount}
      />

      {/* Unlisted */}
      <SidebarItem
        active={activeList === 'unlisted'}
        onClick={() => { onSelectList('unlisted'); setMobileOpen(false); }}
        icon={<InboxIcon size={15} />}
        label="Unlisted"
        count={Math.max(0, unlistedCount)}
      />

      {/* Custom lists */}
      {lists.map((list) => (
        <CustomListItem
          key={list.id}
          list={list}
          active={activeList === list.id}
          allLists={lists}
          onSelect={() => { onSelectList(list.id); setMobileOpen(false); }}
          onDelete={() => deleteMutation.mutate(list.id)}
        />
      ))}

      {/* Add list button */}
      <div className="mt-2 px-1">
        {atLimit ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground"
                disabled
              >
                <Plus size={14} />
                New list
              </Button>
            </TooltipTrigger>
            <TooltipContent>You've reached the maximum of {MAX_CUSTOM_LISTS} lists.</TooltipContent>
          </Tooltip>
        ) : (
          <CreateListPopover lists={lists} disabled={false}>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <Plus size={14} />
              New list
            </Button>
          </CreateListPopover>
        )}
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="md:hidden shrink-0"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu size={16} />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-background border-r shadow-lg z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 shrink-0 border-r min-h-[400px]">
        {sidebarContent}
      </aside>
    </>
  );
}

function SidebarItem({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full text-left transition-colors ${
        active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  );
}

function CustomListItem({
  list,
  active,
  allLists,
  onSelect,
  onDelete,
}: {
  list: UserList;
  active: boolean;
  allLists: UserList[];
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <div
        className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm w-full transition-colors cursor-pointer ${
          active ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
        }`}
        onClick={onSelect}
      >
        <List size={15} />
        <span className="flex-1 truncate">{list.name}</span>
        <span className="text-xs text-muted-foreground mr-1">{list.itemCount}</span>
        <div className="hidden group-hover:flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <RenameListPopover list={list} allLists={allLists}>
            <button className="p-1 rounded hover:bg-muted-foreground/10" title="Edit">
              <Pencil size={13} className="text-muted-foreground" />
            </button>
          </RenameListPopover>
          <button className="p-1 rounded hover:bg-destructive/10" title="Delete" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} className="text-destructive" />
          </button>
        </div>
      </div>
      <DeleteListConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        listName={list.name}
        onConfirm={onDelete}
      />
    </>
  );
}

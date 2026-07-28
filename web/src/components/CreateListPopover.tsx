import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, type UserList } from '@/lib/api';

interface CreateListPopoverProps {
  children: React.ReactNode;
  lists: UserList[];
  disabled?: boolean;
}

export function CreateListPopover({ children, lists, disabled }: CreateListPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (listName: string) => api.lists.create(listName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      setName('');
      setError('');
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const trimmed = name.trim();
  const nameExists = lists.some((l) => l.name.toLowerCase() === trimmed.toLowerCase());
  const canCreate = trimmed.length > 0 && !nameExists;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameExists) {
      setError('A list with this name already exists.');
      return;
    }
    if (canCreate) mutation.mutate(trimmed);
  }

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => { setOpen(v); if (!v) { setName(''); setError(''); } }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-64 p-3" onOpenAutoFocus={(e) => e.preventDefault()} collisionPadding={8}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">New list</p>
          <button onClick={() => setOpen(false)} className="rounded-sm opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="list-name" className="text-xs">Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Wishlist"
              autoFocus
              className="h-8 text-sm"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {nameExists && !error && <p className="text-xs text-destructive">Name already taken.</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canCreate || mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

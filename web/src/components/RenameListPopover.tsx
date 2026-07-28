import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { api, type UserList } from '@/lib/api';

interface RenameListPopoverProps {
  children: React.ReactNode;
  list: UserList;
  allLists: UserList[];
}

export function RenameListPopover({ children, list, allLists }: RenameListPopoverProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(list.name);
  const [isPublic, setIsPublic] = useState(list.isPublic);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { name?: string; isPublic?: boolean }) => api.lists.update(list.id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      setError('');
      setOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const trimmed = name.trim();
  const nameExists = allLists.some((l) => l.id !== list.id && l.name.toLowerCase() === trimmed.toLowerCase());
  const nameChanged = trimmed.length > 0 && !nameExists && trimmed !== list.name;
  const visibilityChanged = isPublic !== list.isPublic;
  const canSave = (nameChanged || visibilityChanged) && !nameExists && trimmed.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameExists) {
      setError('A list with this name already exists.');
      return;
    }
    if (!canSave) return;
    const data: { name?: string; isPublic?: boolean } = {};
    if (nameChanged) data.name = trimmed;
    if (visibilityChanged) data.isPublic = isPublic;
    mutation.mutate(data);
  }

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) { setName(list.name); setIsPublic(list.isPublic); } if (!v) setError(''); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-64 p-3" sticky="always">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Edit list</p>
          <button onClick={() => setOpen(false)} className="rounded-sm opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rename-list" className="text-xs">Name</Label>
            <Input
              id="rename-list"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              autoFocus
              className="h-8 text-sm"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {nameExists && !error && <p className="text-xs text-destructive">Name already taken.</p>}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="list-public" className="text-xs">Public (anyone with link can view)</Label>
            <Switch
              id="list-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSave || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

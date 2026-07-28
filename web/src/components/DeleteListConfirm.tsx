import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteListConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  onConfirm: () => void;
}

export function DeleteListConfirm({ open, onOpenChange, listName, onConfirm }: DeleteListConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm !duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none">
        <DialogHeader>
          <DialogTitle>Delete "{listName}"?</DialogTitle>
          <DialogDescription>
            Products in this list will be moved to Unlisted. They won't be removed from tracking.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onOpenChange(false); }}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface AlertConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  initialAlertPrice?: number | null;
  initialNotifyEveryChange?: boolean;
  onSave: (alertPrice: number | null, notifyEveryChange: boolean) => void;
  isLoading?: boolean;
}

export function AlertConfigModal({
  open,
  onOpenChange,
  title = 'Configure Alert',
  initialAlertPrice,
  initialNotifyEveryChange = true,
  onSave,
  isLoading,
}: AlertConfigModalProps) {
  const [notifyEveryChange, setNotifyEveryChange] = useState(initialNotifyEveryChange);
  const [alertPriceStr, setAlertPriceStr] = useState(initialAlertPrice ? String(initialAlertPrice) : '');

  function handleSave() {
    const alertPrice = !notifyEveryChange && alertPriceStr.trim() !== '' ? parseFloat(alertPriceStr) : null;
    onSave(isNaN(alertPrice!) ? null : alertPrice, notifyEveryChange);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose when you want to be notified about price changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Checkbox
              id="notify-every"
              checked={notifyEveryChange}
              onCheckedChange={(checked: boolean | 'indeterminate') => setNotifyEveryChange(checked === true)}
            />
            <Label htmlFor="notify-every" className="cursor-pointer">
              Notify every change
              <span className="block text-xs text-muted-foreground font-normal">
                Get notified on any price increase or decrease
              </span>
            </Label>
          </div>

          {!notifyEveryChange && (
            <div className="space-y-2">
              <Label htmlFor="alert-price">Alert me when price drops below</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">₹</span>
                <Input
                  id="alert-price"
                  type="number"
                  min={0}
                  placeholder="e.g. 4999"
                  value={alertPriceStr}
                  onChange={(e) => setAlertPriceStr(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

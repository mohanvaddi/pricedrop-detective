import { cn } from '@/lib/utils';

interface PriceTagProps {
  price: number | null | undefined;
  comparePrice?: number | null;
  className?: string;
}

function fmt(price: number) {
  return '₹' + price.toLocaleString('en-IN');
}

export function PriceTag({ price, comparePrice, className }: PriceTagProps) {
  if (price == null) return <span className={cn('text-muted-foreground text-sm', className)}>—</span>;

  let colorClass = '';
  if (comparePrice != null) {
    if (price < comparePrice) colorClass = 'text-green-600 font-semibold';
    else if (price > comparePrice) colorClass = 'text-red-500 font-semibold';
  }

  return <span className={cn(colorClass, className)}>{fmt(price)}</span>;
}

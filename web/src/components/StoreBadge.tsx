import { Badge } from '@/components/ui/badge';

const STORE_META: Record<string, { label: string; color: string }> = {
  amazon: { label: 'Amazon', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  ajio: { label: 'Ajio', color: 'bg-red-100 text-red-800 border-red-200' },
  flipkart: { label: 'Flipkart', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  myntra: { label: 'Myntra', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  tatacliq: { label: 'Tata CLiQ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
};

export function StoreBadge({ website }: { website: string }) {
  const meta = STORE_META[website.toLowerCase()] ?? { label: website, color: '' };
  return (
    <Badge variant="outline" className={meta.color + ' capitalize font-medium'}>
      {meta.label}
    </Badge>
  );
}

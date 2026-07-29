import { Badge } from '@/components/ui/badge';

const STORE_META: Record<string, { label: string; color: string }> = {
  amazon: { label: 'Amazon', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  ajio: { label: 'Ajio', color: 'bg-red-100 text-red-800 border-red-200' },
  flipkart: { label: 'Flipkart', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  myntra: { label: 'Myntra', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  tatacliq: { label: 'Tata CLiQ', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  ikea: { label: 'IKEA', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  decathlon: { label: 'Decathlon', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  lenskart: { label: 'Lenskart', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  meesho: { label: 'Meesho', color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' },
  nykaafashion: { label: 'Nykaa Fashion', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  croma: { label: 'Croma', color: 'bg-green-100 text-green-800 border-green-200' },
  jiomart: { label: 'JioMart', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  blinkit: { label: 'Blinkit', color: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  bigbasket: { label: 'BigBasket', color: 'bg-red-100 text-red-900 border-red-300' },
};

export function StoreBadge({ website }: { website: string }) {
  const meta = STORE_META[website.toLowerCase()] ?? { label: website, color: '' };
  return (
    <Badge variant="outline" className={meta.color + ' capitalize font-medium'}>
      {meta.label}
    </Badge>
  );
}

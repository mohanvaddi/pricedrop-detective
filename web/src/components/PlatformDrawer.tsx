import { useQuery } from '@tanstack/react-query';
import { Globe, Zap, Monitor, Terminal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SheetTrigger } from '@/components/ui/sheet';
import { api, type Platform } from '@/lib/api';

const FETCH_METHOD_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  axios: { label: 'Direct HTTP', icon: Zap, color: 'bg-green-100 text-green-700 border-green-200' },
  browser: { label: 'Browser', icon: Monitor, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  curl: { label: 'Session-based', icon: Terminal, color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: 'bg-orange-100 text-orange-800',
  flipkart: 'bg-blue-100 text-blue-800',
  myntra: 'bg-pink-100 text-pink-800',
  ajio: 'bg-red-100 text-red-800',
  tatacliq: 'bg-purple-100 text-purple-800',
};

function PlatformRow({ platform }: { platform: Platform }) {
  const method = FETCH_METHOD_META[platform.fetchMethod] ?? FETCH_METHOD_META['axios']!;
  const MethodIcon = method.icon;
  const colorClass = PLATFORM_COLORS[platform.id] ?? 'bg-muted text-foreground';

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${colorClass}`}>
          {platform.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-sm">{platform.name}</p>
          <p className="text-xs text-muted-foreground">{platform.id}</p>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${method.color}`}>
        <MethodIcon size={11} />
        {method.label}
      </span>
    </div>
  );
}

interface PlatformDrawerProps {
  children: React.ReactNode;
}

export function PlatformDrawer({ children }: PlatformDrawerProps) {
  const { data: platforms, isLoading } = useQuery({
    queryKey: ['platforms'],
    queryFn: api.platforms.list,
    staleTime: 1000 * 60 * 60, // 1 hour — platform list barely changes
  });

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="flex flex-col overflow-hidden">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-primary" />
            <SheetTitle>Supported Platforms</SheetTitle>
          </div>
          <SheetDescription>
            Platforms we can track prices on. Fetch method indicates how we retrieve product data.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-2.5 w-12 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="pt-2">
              {(platforms ?? []).map((p) => (
                <PlatformRow key={p.id} platform={p} />
              ))}
            </div>
          )}

          <div className="mt-6 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-xs">Fetch methods explained</p>
            <p><span className="font-medium text-green-700">Direct HTTP</span> — plain axios request; fast and reliable.</p>
            <p><span className="font-medium text-blue-700">Browser</span> — Playwright headless browser; used when JS rendering is required.</p>
            <p><span className="font-medium text-amber-700">Session-based</span> — uses a seeded session to bypass bot-detection.</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

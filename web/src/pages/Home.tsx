import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, Bell, Shield, ArrowRight, ChevronRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StoreDrawer } from '@/components/StoreDrawer';

const PLATFORMS = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Tata Cliq', 'IKEA', 'Decathlon', 'Lenskart', 'Meesho', 'Nykaa Fashion', 'Croma', 'JioMart', 'Blinkit', 'BigBasket'];

const FEATURES = [
  {
    icon: TrendingDown,
    title: 'Real-time Price Tracking',
    desc: 'We check prices continuously and log every change so you never miss a deal.',
  },
  {
    icon: Bell,
    title: 'Instant Alerts',
    desc: 'Get notified via Telegram, Reddit, or email the moment a price drops.',
  },
  {
    icon: Shield,
    title: 'All-time Low History',
    desc: 'See the complete price history chart and know if today is truly the best deal.',
  },
];

const STEPS = [
  { num: '01', title: 'Paste a URL', desc: 'Copy the product link from Amazon, Flipkart, or Myntra.' },
  { num: '02', title: 'We track it', desc: 'Our scrapers check the price on a regular schedule.' },
  { num: '03', title: 'You save money', desc: 'Receive an alert when the price hits your target.' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [platformIdx, setPlatformIdx] = useState(0);
  const [fade, setFade] = useState(true);

  const { data: products } = useQuery({ queryKey: ['products'], queryFn: api.products.list });

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPlatformIdx((i) => (i + 1) % PLATFORMS.length);
        setFade(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const totalTracked = products?.length ?? 0;
  const totalSubscribers = products?.reduce((acc, p) => acc + (p.subscriberCount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-24">
      {/* ── Hero ── */}
      <section className="pt-12 pb-8 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
          <TrendingDown size={14} />
          Free price tracking — no credit card needed
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight" style={{ lineHeight: 1.08 }}>
          Stop Overpaying.
          <br />
          <span className="text-primary">Start Saving.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          Track prices on{' '}
          <span
            className="font-semibold text-foreground transition-opacity duration-300"
            style={{ opacity: fade ? 1 : 0 }}
          >
            {PLATFORMS[platformIdx]}
          </span>{' '}
          and get notified the moment the price drops.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/trackers">
            <Button size="lg" className="gap-2 px-8">
              Browse Trackers <ArrowRight size={16} />
            </Button>
          </Link>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                My Dashboard <ChevronRight size={16} />
              </Button>
            </Link>
          ) : (
            <div className="strange-ring">
              <Link to="/register">
                <Button size="lg" variant="outline" className="gap-2 px-8">
                  Get Started Free <ChevronRight size={16} />
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <StoreDrawer>
            <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-dotted underline-offset-4 cursor-pointer hover:text-foreground transition-colors">
              <Globe size={13} />
              Supported stores
            </button>
          </StoreDrawer>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="grid grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
        {[
          { label: 'Products Tracked', value: totalTracked.toLocaleString('en-IN') },
          { label: 'Active Subscribers', value: totalSubscribers.toLocaleString('en-IN') },
          { label: 'Stores Supported', value: '12' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="text-3xl font-bold text-primary">{stat.value}</div>
            <div className="text-smd text-muted-foreground mt-3">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section className="space-y-10">
        <h2 className="text-3xl font-bold text-center">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.num} className="rounded-2xl border bg-card p-8 space-y-3 shadow-sm text-center">
              <div className="text-4xl font-black text-primary/20">{step.num}</div>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-muted-foreground text-smd">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="space-y-10">
        <h2 className="text-3xl font-bold text-center">Everything you need</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-8 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-smd">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform logos ── */}
      <section className="text-center space-y-6 pb-8">
        <p className="text-smd text-muted-foreground uppercase tracking-widest font-medium">Supported platforms</p>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { name: 'Amazon', bg: 'bg-orange-50 border-orange-200 text-orange-700' },
            { name: 'Flipkart', bg: 'bg-blue-50 border-blue-200 text-blue-700' },
            { name: 'Myntra', bg: 'bg-pink-50 border-pink-200 text-pink-700' },
            { name: 'Ajio', bg: 'bg-red-50 border-red-200 text-red-700' },
            { name: 'Tata Cliq', bg: 'bg-purple-50 border-purple-200 text-purple-700' },
            { name: 'IKEA', bg: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { name: 'Decathlon', bg: 'bg-blue-50 border-blue-300 text-blue-800' },
            { name: 'Lenskart', bg: 'bg-teal-50 border-teal-200 text-teal-700' },
            { name: 'Meesho', bg: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700' },
            { name: 'Nykaa Fashion', bg: 'bg-rose-50 border-rose-200 text-rose-700' },
            { name: 'Croma', bg: 'bg-green-50 border-green-200 text-green-700' },
            { name: 'JioMart', bg: 'bg-sky-50 border-sky-200 text-sky-700' },
          ].map((p) => (
            <div
              key={p.name}
              className={`px-6 py-3 rounded-full border text-sm font-semibold ${p.bg}`}
            >
              {p.name}
            </div>
          ))}
        </div>
        <StoreDrawer>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Globe size={14} />
            View all supported stores
          </Button>
        </StoreDrawer>
      </section>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Compass,
  CheckSquare,
  CalendarDays,
  Wallet,
  FileText,
  Sparkles,
  Users,
  CloudSun,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { CURATED_SAMPLE_DESTINATIONS, HERO_COAST_IMAGE } from '../data/destinationsSeed';
import { ImageWithFallback } from '../components/Common/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    navigate(`/explore?${params.toString()}`);
  };

  const featuredDestinations = CURATED_SAMPLE_DESTINATIONS.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* 1. Modern Navigation Bar (Strict 3-zone Top Bar Contract) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-[#0B1D33] whitespace-nowrap shrink-0"
          >
            TripMate
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#destinations"
              className="hover:text-[#0B1D33] transition-colors whitespace-nowrap shrink-0"
            >
              Destinations
            </a>
            <a
              href="#features"
              className="hover:text-[#0B1D33] transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#0B1D33] transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <Link
              to={firebaseUser ? '/dashboard' : '/login'}
              className="hover:text-[#0B1D33] transition-colors whitespace-nowrap shrink-0"
            >
              {firebaseUser ? 'Dashboard' : 'Sign In'}
            </Link>
          </nav>

          <div className="shrink-0">
            <Link
              to={firebaseUser ? '/trips/new' : '/register'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              Start Planning
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative bg-[#0B1D33] text-white overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={HERO_COAST_IMAGE}
            alt="Coastal overlook overlooking a turquoise bay at golden hour"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1D33]/95 via-[#0B1D33]/75 to-[#0B1D33]/35" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#5EEAD4] mb-4">
              Plan Smarter. Pack Better. Travel Happier.
            </p>
            <h1
              className="font-display font-bold tracking-tight text-white leading-[1.1] mb-6"
              style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
            >
              Your Journey, Perfectly Planned.
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl mb-8">
              Discover destinations, organize itineraries, manage your travel budget, and never
              forget an essential item again.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={firebaseUser ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white font-medium text-sm transition-colors whitespace-nowrap"
              >
                Start Planning
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-white font-medium text-sm transition-colors whitespace-nowrap"
              >
                Explore Destinations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Travel Search Section */}
      <section className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
        >
          <div className="md:col-span-6 relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations, countries (e.g., Cox's Bazar, Kyoto, Alps)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 focus:border-[#0D7377]"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377]/30 focus:border-[#0D7377]"
            >
              <option value="All">All Destination Categories</option>
              <option value="Beaches">Beaches</option>
              <option value="Mountains">Mountains</option>
              <option value="Nature">Nature</option>
              <option value="Historical Places">Historical Places</option>
              <option value="Adventure">Adventure</option>
              <option value="Cultural Attractions">Cultural Attractions</option>
              <option value="Museums">Museums</option>
              <option value="Parks">Parks</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-lg bg-[#0B1D33] hover:bg-[#132C4A] text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              Search Places
            </button>
          </div>
        </form>
      </section>

      {/* 4. Popular Destinations */}
      <section id="destinations" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D33] tracking-tight">
              Popular Destinations
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Curated sample guides across Bangladesh and international landmarks to jumpstart your itinerary.
            </p>
          </div>
          <Link
            to="/explore"
            className="text-sm font-medium text-[#0D7377] hover:text-[#0B1D33] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            View all destinations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredDestinations.map((dest) => (
            <Link
              key={dest.id}
              to={`/explore?q=${encodeURIComponent(dest.name)}`}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={dest.imageUrl}
                  alt={dest.name}
                  title={dest.name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                    <span>{dest.country}</span>
                    <span aria-hidden="true">·</span>
                    <span>{dest.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>Sample Guide</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#0B1D33] mb-2">
                    {dest.name}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {dest.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Best season: {dest.bestSeason}</span>
                  <span className="font-medium text-[#0D7377] inline-flex items-center gap-1">
                    Explore <MapPin className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Core Features (Asymmetric Bento Grid) */}
      <section id="features" className="bg-[#F4F1EA] border-y border-[#E8E2D5] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D33] tracking-tight">
              Every travel workflow in one workspace
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Replace scattered spreadsheets, forgotten checklists, and lost booking emails with connected planning modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-7 flex flex-col justify-between">
              <div>
                <CheckSquare className="h-6 w-6 text-[#0D7377] mb-4" />
                <h3 className="font-display text-xl font-semibold text-[#0B1D33] mb-2">
                  Smart Packing Checklist &amp; Gemini Packing Assistant
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                  Start every trip with 36 pre-organized essentials across Clothing, Personal Care, Travel Essentials, Health &amp; Safety, and Electronics—then ask Gemini AI to suggest climate- and activity-specific gear.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Completion percentage tracking</span>
                <span aria-hidden="true">·</span>
                <span>Missing essential alerts</span>
                <span aria-hidden="true">·</span>
                <span>Reusable templates</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-7">
              <CalendarDays className="h-6 w-6 text-[#0369A1] mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0B1D33] mb-2">
                Daily Itinerary Planner
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Switch between Daily Timeline, Calendar, and Activity List views with transit notes, estimated costs, and chronological reordering.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-7">
              <Wallet className="h-6 w-6 text-[#0D7377] mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0B1D33] mb-2">
                Budget &amp; Expense Tracker
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Compare estimated vs. actual spending across 8 categories in BDT, USD, EUR, and more, with visual charts and overspend alerts.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-7">
              <FileText className="h-6 w-6 text-[#0369A1] mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0B1D33] mb-2">
                Private Travel Document Vault
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Store flight tickets, hotel confirmations, booking references, and emergency contacts behind authenticated access controls.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-7">
              <Users className="h-6 w-6 text-[#0D7377] mb-4" />
              <h3 className="font-display text-lg font-semibold text-[#0B1D33] mb-2">
                Collaborative Trip Planning
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Invite friends or family, vote on destination shortlists, share packing duties, and keep joint planning notes in sync.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How TripMate Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D33] tracking-tight">
            How TripMate Works
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            From early inspiration to post-trip memories in four structured steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              num: '01.',
              title: 'Create Your Trip',
              desc: 'Set your destination, dates, traveler count, trip type, and currency budget target.',
            },
            {
              num: '02.',
              title: 'Build Schedule & Gear',
              desc: 'Use AI Smart Packing, live weather forecasts, and the daily timeline planner.',
            },
            {
              num: '03.',
              title: 'Track Budgets & Bookings',
              desc: 'Upload tickets, log actual expenses against estimates, and invite companions.',
            },
            {
              num: '04.',
              title: 'Capture Memories',
              desc: 'Write trip journal entries with photos and archive completed journeys.',
            },
          ].map((step) => (
            <div key={step.num} className="pt-4 border-t border-slate-200">
              <span className="font-mono text-sm font-semibold text-[#0D7377] tabular-nums">
                {step.num}
              </span>
              <h3 className="font-display text-lg font-semibold text-[#0B1D33] mt-2 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Why Choose TripMate */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-[#0B1D33] text-white rounded-2xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Built to solve real travel friction
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Most travel tools handle only flights or only notes. TripMate links your dates, weather, budget, packing essentials, and companions together so nothing falls through the cracks.
            </p>
          </div>
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: Sparkles, title: 'Gemini AI Guidance', text: 'Contextual packing and itinerary drafts on demand.' },
              { icon: CloudSun, title: 'Live Weather Checks', text: 'Real meteorological forecasts before you zip your bag.' },
              { icon: ShieldCheck, title: 'Private by Default', text: 'Strict per-user isolation on documents and budgets.' },
              { icon: Compass, title: 'Local & Global Ready', text: 'Supports BDT, USD, EUR and destinations worldwide.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/8 rounded-xl p-4 border border-white/10">
                  <Icon className="h-5 w-5 text-[#5EEAD4] mb-2" />
                  <h3 className="font-display text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Travel Inspiration & 9. Testimonials (Adjacent Claim-to-Proof) */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <h2 className="font-display text-2xl font-bold text-[#0B1D33] mb-6">
              Travel Inspiration
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {CURATED_SAMPLE_DESTINATIONS.slice(6, 8).map((dest) => (
                <Link
                  key={dest.id}
                  to={`/explore?q=${encodeURIComponent(dest.name)}`}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    <ImageWithFallback src={dest.imageUrl} alt={dest.name} title={dest.name} />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-slate-500 mb-1">
                      {dest.country} · {dest.bestSeason}
                    </p>
                    <h3 className="font-display font-semibold text-[#0B1D33]">{dest.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <h2 className="font-display text-2xl font-bold text-[#0B1D33] mb-6">
              How Travelers Use TripMate
            </h2>
            <div className="space-y-4">
              <blockquote className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  “Before TripMate, our group of six lost track of bus tickets and forgot rain gear in Sajek. Putting our itinerary, split expenses, and packing templates in one place cut pre-trip prep in half.”
                </p>
                <footer className="text-xs text-slate-500">
                  <strong className="text-slate-900 font-medium">Tariqul Hasan</strong> · Group Organizer, Dhaka Travel Club
                </footer>
              </blockquote>
              <blockquote className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  “Having the BDT/USD expense comparison right alongside our daily Kyoto schedule kept us within 4% of our target budget across a 9-day family trip.”
                </p>
                <footer className="text-xs text-slate-500">
                  <strong className="text-slate-900 font-medium">Nusrat Rahman</strong> · Product Designer &amp; Solo/Family Traveler
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Call to Action */}
      <section className="bg-[#F4F1EA] border-t border-[#E8E2D5] py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D33] mb-3">
            Ready to organize your next trip?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mb-7">
            Create your free TripMate account to save destinations, build checklists, and collaborate with companions.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to={firebaseUser ? '/dashboard' : '/register'}
              className="px-6 py-3 rounded-lg bg-[#0D7377] hover:bg-[#0F766E] text-white text-sm font-medium transition-colors"
            >
              {firebaseUser ? 'Open My Dashboard' : 'Create Free Account'}
            </Link>
            <Link
              to="/explore"
              className="px-6 py-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
            >
              Browse Destinations
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="font-display font-bold text-sm text-[#0B1D33]">TripMate</span>
            <span>Plan Smarter. Pack Better. Travel Happier.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/explore" className="hover:text-slate-900">
              Destinations
            </Link>
            <Link to="/login" className="hover:text-slate-900">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-900">
              Register
            </Link>
            <span>© {new Date().getFullYear()} TripMate</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

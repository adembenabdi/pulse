'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PrayerTimes } from '@/types';

// Aladhan API for prayer times — free, no API key needed
// Uses Algiers as default, adjustable per city

const CITIES: Record<string, { lat: number; lng: number }> = {
  'Algiers': { lat: 36.7538, lng: 3.0588 },
  'Oran': { lat: 35.6969, lng: -0.6331 },
  'Constantine': { lat: 36.365, lng: 6.6147 },
  'Annaba': { lat: 36.9, lng: 7.7667 },
  'Blida': { lat: 36.4722, lng: 2.8278 },
  'Batna': { lat: 35.5569, lng: 6.1742 },
  'Setif': { lat: 36.1898, lng: 5.4108 },
  'Tlemcen': { lat: 34.8828, lng: -1.3167 },
  'Bejaia': { lat: 36.7508, lng: 5.0564 },
  'Biskra': { lat: 34.8415, lng: 5.7286 },
  'Djelfa': { lat: 34.6704, lng: 3.2503 },
  'Tizi Ouzou': { lat: 36.7169, lng: 4.0497 },
  'Jijel': { lat: 36.7944, lng: 5.7722 },
  'Skikda': { lat: 36.8764, lng: 6.9061 },
  'Chlef': { lat: 36.1647, lng: 1.3317 },
  'Ghardaia': { lat: 32.4903, lng: 3.6736 },
};

export const ALGERIAN_CITIES = Object.keys(CITIES);

const PRAYER_NAMES: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function usePrayerTimes(city: string = 'Algiers') {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; remaining: string } | null>(null);

  const fetchTimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = CITIES[city] || CITIES['Algiers'];
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();

      const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${coords.lat}&longitude=${coords.lng}&method=19`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch prayer times');
      const data = await res.json();
      const timings = data.data.timings;

      const prayerTimes: PrayerTimes = {
        Fajr: timings.Fajr,
        Sunrise: timings.Sunrise,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
      };

      setTimes(prayerTimes);

      // Cache for today
      localStorage.setItem(`pulse:prayer:${city}:${dd}-${mm}-${yyyy}`, JSON.stringify(prayerTimes));
    } catch (err) {
      // Try cache
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const cached = localStorage.getItem(`pulse:prayer:${city}:${dd}-${mm}-${yyyy}`);
      if (cached) {
        setTimes(JSON.parse(cached));
      } else {
        setError('Could not load prayer times. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [city]);

  // Calculate next prayer
  useEffect(() => {
    if (!times) return;

    const update = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const name of PRAYER_NAMES) {
        if (name === 'Sunrise') continue;
        const [h, m] = times[name].split(':').map(Number);
        const prayerMinutes = h * 60 + m;
        if (prayerMinutes > currentMinutes) {
          const diff = prayerMinutes - currentMinutes;
          const hours = Math.floor(diff / 60);
          const mins = diff % 60;
          setNextPrayer({
            name,
            time: times[name],
            remaining: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
          });
          return;
        }
      }
      // After Isha — next is Fajr tomorrow
      setNextPrayer({ name: 'Fajr', time: times.Fajr, remaining: 'Tomorrow' });
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [times]);

  useEffect(() => { fetchTimes(); }, [fetchTimes]);

  return { times, loading, error, nextPrayer, refetch: fetchTimes, PRAYER_NAMES };
}

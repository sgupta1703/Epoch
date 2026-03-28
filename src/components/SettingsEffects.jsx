import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getSettings } from '../api/settings';

const CACHE_KEY = 'epoch_cached_settings';

function applySettings(settings = {}) {
  const body = document.body;
  body.classList.remove('epoch-density-compact', 'epoch-density-comfortable', 'epoch-density-expanded', 'epoch-reduce-motion');

  const density = settings.view_density || 'comfortable';
  body.classList.add(`epoch-density-${density}`);
  if (settings.reduce_motion) body.classList.add('epoch-reduce-motion');
}

export default function SettingsEffects() {
  const { isAuthenticated, role } = useAuth();

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) applySettings(JSON.parse(cached));
      else applySettings({});
    } catch {
      applySettings({});
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      applySettings({});
      return;
    }

    let cancelled = false;

    getSettings()
      .then(({ settings }) => {
        if (cancelled) return;
        applySettings(settings || {});
        localStorage.setItem(CACHE_KEY, JSON.stringify(settings || {}));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, role]);

  useEffect(() => {
    function handleSettingsChanged(event) {
      const settings = event.detail?.settings || {};
      applySettings(settings);
      localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    }

    window.addEventListener('epoch:settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('epoch:settings-changed', handleSettingsChanged);
  }, []);

  return null;
}

import { useEffect, useState } from 'react';
import { getSettings } from '../api/settings';

export function useSettings(defaultSettings = {}) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getSettings()
      .then(({ settings: nextSettings }) => {
        if (!cancelled) setSettings({ ...defaultSettings, ...(nextSettings || {}) });
      })
      .catch(() => {
        if (!cancelled) setSettings(defaultSettings);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleSettingsChanged(event) {
      setSettings({ ...defaultSettings, ...(event.detail?.settings || {}) });
    }

    window.addEventListener('epoch:settings-changed', handleSettingsChanged);
    return () => window.removeEventListener('epoch:settings-changed', handleSettingsChanged);
  }, []);

  return { settings, loading, setSettings };
}

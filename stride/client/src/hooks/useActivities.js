import { useState, useEffect } from 'react';
import { getActivities } from '../utils/api.js';

export function useActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetch(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      const data = await getActivities(refresh);
      setActivities(data);
    } catch {
      setError('Could not load your runs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetch(); }, []);

  return { activities, loading, error, refresh: () => fetch(true) };
}
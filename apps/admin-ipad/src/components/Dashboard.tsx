import { useEffect, useState } from 'react';
import { DashboardV1 } from './v1/Dashboard.tsx';
import { DashboardV2 } from './v2/Dashboard.tsx';

const V1_HASH = '#v1';

export function Dashboard() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return hash === V1_HASH ? <DashboardV1 /> : <DashboardV2 />;
}

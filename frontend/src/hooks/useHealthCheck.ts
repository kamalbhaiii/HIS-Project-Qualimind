import { useEffect, useState } from 'react';
import { checkHealth } from '../services/modules/health.api';

export const useHealthCheck = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    checkHealth().then(setHealth).catch(console.error);
  }, []);

  return health;
};

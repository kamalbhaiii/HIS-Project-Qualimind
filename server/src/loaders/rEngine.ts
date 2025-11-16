import axios from 'axios';
import cfg from '@config/index';

export async function checkREngineHealth() {
  try {
    const res = await axios.get(`${cfg.rService.url}/health`, { timeout: 2000 });
    const status = res.data?.status?.[0];
    return status
  } catch (err) {
    return 'error';
  }
}

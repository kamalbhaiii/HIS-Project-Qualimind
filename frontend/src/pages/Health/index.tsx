import { AppBar } from "@mui/material";
import { useHealthCheck } from '../../hooks/useHealthCheck';

export default function Health() {
    const health = useHealthCheck();
  return <div>
    <AppBar>
        <h1>Health Check</h1>
        <h3>Server Status:</h3>
        <pre>{health ? JSON.stringify(health, null, 2) : "Server is inactive."}</pre>
    </AppBar>
  </div>;
}

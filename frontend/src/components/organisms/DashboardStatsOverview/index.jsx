import React from "react";

const DashboardStatsOverview = ({ stats }) => {
  const { processedDatasets, runningJobs, failedJobs24h, pendingJobs } = stats;

  return (
    <>
      <style>{`
        .dashboard-container {
          width: 100%;
          padding: 16px 0;
          box-sizing: border-box;
        }

        /* Header */
        .dashboard-header h2 {
          margin: 0;
          font-size: clamp(18px, 2.2vw, 24px);
          font-weight: 600;
          line-height: 1.2;
          word-break: break-word;
        }

        .dashboard-header p {
          margin-top: 6px;
          color: #666;
          font-size: clamp(12px, 1.4vw, 14px);
          line-height: 1.4;
        }

        /* Grid */
        .stats-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Small tablets */
        @media (min-width: 600px) {
          .dashboard-container { padding: 18px 0; }
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        }

        /* Desktop */
        @media (min-width: 1024px) {
          .dashboard-container { padding: 20px 0; }
          .stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
        }

        /* Cards */
        .stat-card {
          padding: 16px;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          min-width: 0; /* IMPORTANT: prevents overflow in grid */
          box-sizing: border-box;
        }

        @media (min-width: 600px) {
          .stat-card { padding: 18px; }
        }

        @media (min-width: 1024px) {
          .stat-card { padding: 20px; }
        }

        .stat-card h4 {
          margin: 0;
          color: #444;
          font-size: clamp(13px, 1.6vw, 16px);
          font-weight: 500;
          line-height: 1.25;
          /* Prevent long titles from forcing width */
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stat-card h2 {
          margin: 10px 0;
          font-size: clamp(22px, 3vw, 32px);
          font-weight: 700;
          line-height: 1.15;
          /* Avoid layout break on huge numbers */
          overflow-wrap: anywhere;
        }

        .stat-card span {
          color: #777;
          font-size: clamp(11px, 1.2vw, 13px);
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
      `}</style>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Overview</h2>
          <p>High-level snapshot of your preprocessing activity</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h4>Processed datasets</h4>
            <h2>{processedDatasets}</h2>
            <span>Total successfully processed</span>
          </div>

          <div className="stat-card">
            <h4>Running jobs</h4>
            <h2>{runningJobs}</h2>
            <span>Currently in progress</span>
          </div>

          <div className="stat-card">
            <h4>Pending jobs (24h)</h4>
            <h2>{pendingJobs}</h2>
            <span>Waiting to process</span>
          </div>

          <div className="stat-card">
            <h4>Failed jobs (24h)</h4>
            <h2>{failedJobs24h}</h2>
            <span>Recent failures</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardStatsOverview;

import React from "react";

const DashboardStatsOverview = ({ stats }) => {
  const { processedDatasets, runningJobs, failedJobs24h, pendingJobs } = stats;

  return (
    <>
      {/* --- CSS inside same file --- */}
      <style>{`
        .dashboard-container {
          width: 100%;
          padding: 20px 0;
        }
        
        .dashboard-header h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        
        .dashboard-header p {
          margin-top: 4px;
          color: #666;
          font-size: 14px;
        }
        
        .stats-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 20px;
        }
        
        @media (min-width: 600px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        .stat-card {
          padding: 20px;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
        }
        
        .stat-card h4 {
          margin: 0;
          color: #444;
          font-size: 16px;
          font-weight: 500;
        }
        
        .stat-card h2 {
          margin: 12px 0;
          font-size: 32px;
          font-weight: 700;
        }
        
        .stat-card span {
          color: #777;
          font-size: 13px;
        }
      `}</style>

      {/* --- Component HTML --- */}
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
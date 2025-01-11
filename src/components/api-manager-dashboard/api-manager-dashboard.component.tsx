import React from 'react';
import './api-manager-dashboard.component.css';
import { RateLimitManager } from '../../services/rate-limit.manager';
import RateLimitDisplay from './rate-limit-display/rate-limit-display.component';

const ApiManagerDashboard: React.FC = () => {
  return (
    <div className="api-manager-dashboard">
      <div className="widget-container">
        <div className="rate-limits-container">
          {RateLimitManager.instance.getRateLimitTypes().map((rateLimit, idx) => (
            <RateLimitDisplay limitType={rateLimit} key={idx} />
          ))}
        </div>

        <div className="data-container">
          <div className="widget api-errors-container">
            {/* Api errors logging */}
          </div>

          <div className="widget database-status-container">
            {/* Database status */}
          </div>

          <div className="widget data-usage-container">
            {/* Data usage */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiManagerDashboard;

import React, { useEffect, useState } from 'react';

import './rate-limit-display.component.css';

import { RateLimitManager } from '../../../services/rate-limit.manager';
import { RateLimit, RateLimits } from '../../../utils/models/rate-limit.model';

interface RateLimitDisplayProps {
    limitType: RateLimits;
}

const RateLimitDisplay: React.FC<RateLimitDisplayProps> = ({ limitType }) => {
    const [limits, setLimits] = useState<RateLimit[]>([]);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

    useEffect(() => {
        const updateLimits = () => {
            const currentLimits = RateLimitManager.instance.getLimitsForType(limitType);
            setLimits(currentLimits);
            setLastUpdateTime(new Date());
        };

        updateLimits();

        const intervalId = setInterval(updateLimits, 500);

        return () => clearInterval(intervalId);
    }, [limitType]);

    const formatRemainingTime = (resetAt: Date | null): string => {
        if (!resetAt) return 'N/A';
        const diff = Math.floor(resetAt.getTime() / 1000) - Math.floor(lastUpdateTime.getTime() / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatDateTime = (date: Date | null): string => {
        if (!date) return 'N/A';
        return date.toLocaleString();
    }

    const hasActiveRules = limits.some(limit =>
        limit.date.getTime() + limit.evaluatedPeriod > lastUpdateTime.getTime()
    );

    return (
        <div className="rate-limit-display">
            <div className="rate-limit-display-header">
                <h2>{limitType} Rate Limit</h2>
                <p className="last-update">Last updated: {formatDateTime(lastUpdateTime)}</p>
            </div>

            <div className="rate-limit-display-body">
                {hasActiveRules ? (
                    limits.map((limit, index) => (
                        limit.date.getTime() + limit.evaluatedPeriod > lastUpdateTime.getTime() && 
                        <div key={index} className="rate-limit-display-rule">
                            <div className="rate-limit-display-rule-header">
                                <h3 className="rule-number">Rule {index + 1}</h3>
                                <div className="rule-info">
                                    <p>Last update: {formatDateTime(limit.date)}</p>
                                    <p>Resets in: {formatRemainingTime(new Date(limit.date.getTime() + limit.evaluatedPeriod))}</p>
                                </div>
                            </div>

                            <div className="rate-limit-display-rule-body">
                                <div className="load-status">
                                    <div className="load-status-dot">
                                        <span className={`status-dot ${limit.isReachable(lastUpdateTime) ? 'available' : 'unavailable'}`}></span>
                                        <p className="load-text">{limit.isReachable(lastUpdateTime) ? 'Available' : 'In Cooldown'}</p>
                                    </div>
                                    <div className="load-status-text">
                                        <p className="load-text"> {limit.currentHits} / {limit.maximumHits} ({Math.floor(limit.currentHits / limit.maximumHits * 100)}%)</p>
                                    </div>
                                </div>
                                <div className="progress-bar">
                                    <div className="bar" style={{ width: `${(limit.currentHits / limit.maximumHits) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="no-active-rules">Currently no Active {limitType} Rate Limiting Rule</p>
                )}
            </div>
        </div>
    );
};

export default RateLimitDisplay;

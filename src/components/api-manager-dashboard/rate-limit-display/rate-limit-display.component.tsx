import React, { useEffect, useState } from 'react';
import './rate-limit-display.component.css';
import { RateLimitManager } from '../../../services/rate-limit.manager';
import { RateLimit, RateLimits } from '../../../utils/models/rate-limit.model';
import { motion } from 'framer-motion';

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
        
        const intervalId = setInterval(updateLimits, 250);
        
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
    
    const hasActiveRules = limits.some(limit =>
        limit.date.getTime() + limit.evaluatedPeriod > lastUpdateTime.getTime()
    );
    
    return (
        <div className="rate-limit-display">
            <div className="rate-limit-display-header">
            <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="rate-limit-title"
            >
                {limitType} Rate Limit
            </motion.h2>
            <p className="last-update-time">Last Update: {lastUpdateTime.toLocaleTimeString()}</p>
        </div>
        
        <div className="rate-limit-display-body">
            {hasActiveRules ? (
                limits.map((limit, index) =>
                    limit.date.getTime() + limit.evaluatedPeriod > lastUpdateTime.getTime() && (
                        <motion.div
                            key={index}
                            className="rate-limit-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                        >
                            <div className="rate-limit-card-body">
                                <div className="load-status">
                                    <div className="status-row">
                                        <span className={`status-dot ${limit.isReachable(lastUpdateTime) ? 'available' : 'unavailable'}`}></span>
                                        <p className="load-text">
                                            {limit.isReachable(lastUpdateTime) ? 'Available' : 'In Cooldown'}
                                        </p>
                                    <div className="hits-count">
                                    {limit.currentHits} / {limit.maximumHits}
                                </div>
                            </div>
                            <motion.div
                                className="progress-bar"
                                initial={{ width: 0 }}
                                animate={{ width: `${(limit.currentHits / limit.maximumHits) * 100}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            >
                                <div className="bar" />
                            </motion.div>
                            </div>
                                <div className="reset-time">
                                    Resets in: {formatRemainingTime(new Date(limit.date.getTime() + limit.evaluatedPeriod))}
                                </div>
                            </div>
                        </motion.div>
                    )
                )
            ) : (
                <p className="no-active-rules">No active {limitType} rate limit rules</p>
            )}
    </div>
    </div>
);
};

export default RateLimitDisplay;

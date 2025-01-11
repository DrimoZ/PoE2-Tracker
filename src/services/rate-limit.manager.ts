import { RateLimit, RateLimits } from '../utils/models/rate-limit.model';
import { AxiosResponseHeaders } from 'axios';


class RateLimitManager {
    
    // Static Instance
    
    private static _instance: RateLimitManager;
    
    public static get instance(): RateLimitManager {
        if (!RateLimitManager._instance) {
            RateLimitManager._instance = new RateLimitManager();
        }
        return RateLimitManager._instance;
    }
    
    // Private Properties
    
    private _rateLimits: Map<RateLimits, Array<RateLimit>>;
    
    // Life Cycle
    
    private constructor() {
        this._rateLimits = new Map().set(RateLimits.IP, []).set(RateLimits.CLIENT, []).set(RateLimits.ACCOUNT, []);

        this._rateLimits.set(RateLimits.IP, [
            new RateLimit({maximumHits: 5, evaluatedPeriod: 10, restrictedTime: 60}), 
            new RateLimit({maximumHits: 15, evaluatedPeriod: 60, restrictedTime: 600}),
            new RateLimit({maximumHits: 30, evaluatedPeriod: 300, restrictedTime: 1800})
        ]);

        setInterval(() => {
            const date = new Date();

            if (this.isTypeReachable(RateLimits.IP, date)) {
                const data = this.getLimitsForType(RateLimits.IP);

                const totalHits = Math.round(this.availableHits(RateLimits.IP, date) * Math.random());

                const hits0 = data[0].currentHits >= data[0].maximumHits * RateLimit.actualLimitPourcentage ? totalHits : data[0].currentHits + totalHits;
                data[0].update(date, hits0, 10, 0);

                const hits1 = data[1].currentHits >= data[1].maximumHits * RateLimit.actualLimitPourcentage ? totalHits : data[1].currentHits + totalHits;
                data[1].update(date, hits1, 60, 0);

                const hits2 = data[2].currentHits >= data[2].maximumHits * RateLimit.actualLimitPourcentage ? totalHits : data[2].currentHits + totalHits;
                data[2].update(date, hits2, 300, 0);
            }
        }, 5_000 * Math.random());
    }
    
    // Interface
    
    public async updateRateLimitsFromHeader(header: AxiosResponseHeaders): Promise<void> {
        try {
            await this.parseHeader(header);
        } catch (error) {
            console.error('Error updating rate limits:', error);
        }
    }

    public async waitForType(type: RateLimits, date: Date): Promise<void> {
        if (!this._rateLimits.has(type)) return;
        
        const rateLimits = this._rateLimits.get(type)!;
        const waitTimes = rateLimits.map(limit => limit.getWaitTime(date));
        
        const waitTime = Math.max(...waitTimes);
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    public isTypeReachable(type: RateLimits, date: Date): boolean {
        if (!this._rateLimits.has(type)) return true;
        
        const rateLimits = this._rateLimits.get(type)!;        
        return rateLimits.every(limit => limit.isReachable(date));
    }

    public availableHits(type: RateLimits, date: Date): number {
        if (!this._rateLimits.has(type)) return 0;
        
        const rateLimits = this._rateLimits.get(type)!;

        // Returns the lowest available hits
        return Math.min(...rateLimits.map(limit => limit.availableHits(date)));
    }

    public getLimitsForType(type: RateLimits): RateLimit[] {
        return this._rateLimits.get(type) ?? [];
    }

    public getRateLimits(): Map<RateLimits, Array<RateLimit>> {
        return this._rateLimits;
    }

    public getRateLimitTypes(): RateLimits[] {
        return Array.from(this._rateLimits.keys());
    }
    
    // Inner Work (Header Parsing)

    private async parseHeader(header: Record<string, string>): Promise<void> {
        const retryAfter = parseInt(header['retry-after']);
        if (retryAfter) {
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        }
        
        const rateLimitRule: RateLimits = header['x-rate-limit-rules'] as RateLimits;
        if (!rateLimitRule) throw new Error('Missing x-rate-limit-rules header');
        
        const rateLimit = header[`x-rate-limit-${rateLimitRule.toLowerCase()}`];
        const rateLimitState = header[`x-rate-limit-${rateLimitRule.toLowerCase()}-state`];
        
        if (!rateLimit || !rateLimitState) throw new Error('Missing rate limit or state information');

        const date = header['date'] ? new Date(header['date']) : new Date(Date.now());
        
        await this.parseRateLimit(rateLimitRule, rateLimit, rateLimitState, date);
    }
    
    private async parseRateLimit(rateLimitRule: RateLimits, rateLimit: string, rateLimitState: string, date: Date): Promise<void> {
        const rateLimitArray = rateLimit.split(',');
        const rateLimitStateArray = rateLimitState.split(',');
        
        const parsedRateLimits = await Promise.all(
            rateLimitArray.map(async (limitString, index) => {
                const [maxHits, evaluatedPeriod, restrictedTime] = limitString.split(':');
                const [currentHits, currentPeriod, currentRestrictedTime] = rateLimitStateArray[index].split(':');
                
                return new RateLimit({
                    date,
                    maximumHits: parseInt(maxHits),
                    evaluatedPeriod: parseInt(evaluatedPeriod),
                    restrictedTime: parseInt(restrictedTime),
                    currentHits: parseInt(currentHits),
                    currentPeriod: parseInt(currentPeriod),
                    currentRestrictedTime: parseInt(currentRestrictedTime),
                });
            })
        );
        
        this.updateRateLimits(rateLimitRule, parsedRateLimits);
    }

    // Inner Work (Rate Limit Update)
    
    private updateRateLimits(rateLimitRule: RateLimits, newRateLimits: RateLimit[]): void {
        if (this._rateLimits.has(rateLimitRule)) {
            const existingRateLimits = this._rateLimits.get(rateLimitRule)!;
            const updatedRateLimits = [...existingRateLimits];
            
            for (const newLimit of newRateLimits) {
                const existingLimit = updatedRateLimits.find(limit => 
                    limit.maximumHits === newLimit.maximumHits &&
                    limit.evaluatedPeriod === newLimit.evaluatedPeriod &&
                    limit.restrictedTime === newLimit.restrictedTime
                );
                
                if (existingLimit) {
                    existingLimit.update(newLimit.date, newLimit.currentHits, newLimit.currentPeriod, newLimit.currentRestrictedTime);
                } else {
                    updatedRateLimits.push(newLimit);
                }
            }
            
            this._rateLimits.set(rateLimitRule, updatedRateLimits);
        } else {
            this._rateLimits.set(rateLimitRule, newRateLimits);
        }
    }

    // Inner Work (Others)
}

export { RateLimitManager };
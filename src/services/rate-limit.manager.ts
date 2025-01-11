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
        this._rateLimits = new Map();

        this._rateLimits.set(RateLimits.IP, [
            new RateLimit({maximumHits: 5, evaluatedPeriod: 10, restrictedTime: 60}), 
            new RateLimit({maximumHits: 15, evaluatedPeriod: 60, restrictedTime: 600}),
            new RateLimit({maximumHits: 30, evaluatedPeriod: 300, restrictedTime: 1800})
        ]);
        this._rateLimits.set(RateLimits.CLIENT, [
            new RateLimit({maximumHits: 5, evaluatedPeriod: 10, restrictedTime: 60}), 
            new RateLimit({maximumHits: 15, evaluatedPeriod: 60, restrictedTime: 600}),
            new RateLimit({maximumHits: 30, evaluatedPeriod: 300, restrictedTime: 1800})
        ]);
        this._rateLimits.set(RateLimits.ACCOUNT, [
        ]);

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.IP);

            a[0].update(new Date(), (a[0].currentHits + 1) % a[0].maximumHits, 10, 0);

            this.updateRateLimits(RateLimits.IP, a);
        }, 150_000 * Math.random());

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.IP);

            a[0].update(new Date(), (a[0].currentHits + Math.round(Math.random() + 1)) % a[0].maximumHits, 10, 0);

            this.updateRateLimits(RateLimits.IP, a);
        }, 15_000 * Math.random());

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.IP);

            a[1].update(new Date(), (a[1].currentHits + Math.round(Math.random() + 2)) % a[1].maximumHits, 30, 0);

            this.updateRateLimits(RateLimits.IP, a);
        }, 15_000 * Math.random());

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.IP);

            a[2].update(new Date(), (a[2].currentHits + 2) % a[2].maximumHits, 60, 0);

            this.updateRateLimits(RateLimits.IP, a);
        }, 60_000 * Math.random());

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.CLIENT);

            a[2].update(new Date(), (Math.round(a[2].currentHits + Math.random() * 3)) % a[2].maximumHits, 60, 0);

            this.updateRateLimits(RateLimits.CLIENT, a);
        }, 10_000 * Math.random());

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.CLIENT);

            a[0].update(new Date(), (Math.round(a[0].currentHits + Math.random() * 2)) % a[0].maximumHits, 60, 0);

            this.updateRateLimits(RateLimits.CLIENT, a);
        }, 150_000 * Math.random());

        setInterval(() => {
            const a = this.getLimitsForType(RateLimits.CLIENT);

            a[0].update(new Date(), (Math.round(a[0].currentHits + Math.random() * 1)) % a[0].maximumHits, 60, 0);

            this.updateRateLimits(RateLimits.CLIENT, a);
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
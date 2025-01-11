enum RateLimits {
    IP = "Ip",
    CLIENT = "Client",
    ACCOUNT = "Account",
}

class RateLimit {

    // Static Properties

    public static readonly actualLimitPourcentage: number = 0.8;
    
    // Private Properties

    private _date: Date;

    private _maximumHits: number;
    private _currentHits: number;

    private _evaluatedPeriod: number;
    private _currentPeriod: number;

    private _restrictedTime: number;
    private _currentRestrictedTime: number;

    // Life Cycle

    constructor(fields: {
        date?: Date,

        maximumHits: number,
        evaluatedPeriod: number,
        restrictedTime: number,

        currentHits?: number,
        currentPeriod?: number,
        currentRestrictedTime?: number,
    }) {
        this._maximumHits = fields.maximumHits;
        this._currentHits = fields.currentHits ?? 0;

        this._evaluatedPeriod = fields.evaluatedPeriod * 1000;
        this._currentPeriod = (fields.currentPeriod ?? 0) * 1000;

        this._restrictedTime = fields.restrictedTime * 1000;
        this._currentRestrictedTime = (fields.currentRestrictedTime ?? 0) * 1000;

        this._date = fields.date ?? new Date(Date.now());
    }

    // Interface

    public update(date: Date, currentHits: number, currentPeriod: number, currentRestrictedTime: number): void {
        this._date = date;

        this._currentHits = currentHits;
        this._currentPeriod = currentPeriod * 1000;
        this._currentRestrictedTime = currentRestrictedTime * 1000;
    }

    public isReachable(date: Date): boolean {
        const timePassed: number = date.getTime() - this._date.getTime();

        // Only check if period is relevant
        if (timePassed <= this._currentPeriod) {
            // If currently in cooldown period return false
            if (timePassed <= this._currentRestrictedTime) return false;

            // If the maximum hits (* pourcentage) have been reached return false
            if (this._currentHits >= this._maximumHits * RateLimit.actualLimitPourcentage) return false;
        }

        return true;
    }

    public availableHits(date: Date): number {
        // Only check if period is relevant
        if (!this.isReachable(date)) return 0;

        // Return the number of hits available based on date
        const timePassed: number = date.getTime() - this._date.getTime();
        const maxHits: number = Math.ceil(this._maximumHits * RateLimit.actualLimitPourcentage);

        if (timePassed > this._currentPeriod) return maxHits;
        return maxHits - this._currentHits;
    }

    public getWaitTime(date: Date): number {
        // If reachable => no wait time
        if (this.isReachable(date)) return 0;

        // Return the time to wait before next hit
        const timePassed: number = date.getTime() - this._date.getTime();

        // If currently in cooldown period return the remaining time
        if (timePassed <= this._currentRestrictedTime) 
            return this._currentRestrictedTime - timePassed;

        // If the maximum hits (* pourcentage) have been reached return the remaining time
        if (this._currentHits >= this._maximumHits * RateLimit.actualLimitPourcentage)
            return this._currentPeriod - timePassed;

        return 0;        
    }

    // Inner Work

    // Getters

    public get date(): Date {
        return this._date;
    }

    public get maximumHits(): number {
        return this._maximumHits;
    }

    public get currentHits(): number {
        return this._currentHits;
    }

    public get evaluatedPeriod(): number {
        return this._evaluatedPeriod;
    }

    public get currentPeriod(): number {
        return this._currentPeriod;
    }

    public get restrictedTime(): number {
        return this._restrictedTime;
    }

    public get currentRestrictedTime(): number {
        return this._currentRestrictedTime;
    }

    // To String
    
    public toString(): string {
        return `RateLimit: {
            date: ${this._date},
            maximumHits: ${this._maximumHits},
            currentHits: ${this._currentHits},
            evaluatedPeriod: ${this._evaluatedPeriod},
            currentPeriod: ${this._currentPeriod},
            restrictedTime: ${this._restrictedTime},
            currentRestrictedTime: ${this._currentRestrictedTime},
        }`;
    }
}


export { RateLimits, RateLimit };
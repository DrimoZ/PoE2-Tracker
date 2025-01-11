import { AxiosRequestConfig } from "axios";
import { AxiosService } from "./axios.service";
import { RateLimitManager } from "./rate-limit.manager";
import { RateLimits } from "../utils/models/rate-limit.model";

class RequestsManager {
    
    // Static Instance
    
    private static _instance: RequestsManager;
    
    public static get instance(): RequestsManager {
        if (!RequestsManager._instance) {
            RequestsManager._instance = new RequestsManager();
        }
        return RequestsManager._instance;
    }
    
    // Private Properties
    
    private readonly _rateLimitManager: RateLimitManager;
    private readonly _axiosService: AxiosService;

    private readonly callQueue: {
        request: AxiosRequestConfig;
        resolve: (response: unknown) => void;
        reject: (error: unknown) => void;
    }[] = [];

    private _isRunning: boolean;
    
    // Life Cycle
    
    private constructor() {
        this._rateLimitManager = RateLimitManager.instance;
        this._axiosService = AxiosService.instance;

        this._isRunning = false;
    }
    
    // Interface (Loop)
    
    public start(): void {
        if (!this._isRunning) {
            this._isRunning = true;
            
            this.startLoop();
        }
    }
    
    public stop(): void {
        this._isRunning = false;
    }

    // Interface (Requests)

    public addRequest(request: AxiosRequestConfig): Promise<unknown> {
        return new Promise((resolve, reject) => {
            this.callQueue.push({
                request,
                resolve: (response: unknown) => {
                    resolve(response);
                },
                reject: (error: unknown) => {
                    reject(error);
                },
            });
        });
    }
    
    // Inner Work (Loop)
    
    private async startLoop(): Promise<void> {
        if (!this._isRunning) return;

        while (this._isRunning) {
            await this.processRequests();
            await new Promise(resolve => setTimeout(resolve, 1_000));
        }
    }

    // Inner Work (Requests)

    private async processRequests(): Promise<void> {
        const limitType = RateLimits.IP;
        const currentDate = new Date(Date.now());

        while (this._isRunning && this.callQueue.length > 0) {
            if (!this._rateLimitManager.isTypeReachable(limitType, currentDate)) {
                await this._rateLimitManager.waitForType(limitType, currentDate);
                continue;
            }

            const concurrentRequests = this.callQueue.splice(0, this._rateLimitManager.availableHits(limitType, currentDate));
        
            for (const { request, resolve, reject } of concurrentRequests) {
                while (!this._rateLimitManager.isTypeReachable(limitType, currentDate)) {
                    await this._rateLimitManager.waitForType(limitType, currentDate);
                }

                try {
                    const response = await this._axiosService.request(request);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        
            await new Promise(resolve => setTimeout(resolve, 5_000));
        }

        await new Promise(resolve => setTimeout(resolve, 30_000));
    }
}

export { RequestsManager };
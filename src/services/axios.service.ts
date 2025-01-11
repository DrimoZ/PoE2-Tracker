import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponseHeaders } from 'axios';
import { RateLimitManager } from './rate-limit.manager';

class AxiosService {
    
    // Static Instance

    private static _instance: AxiosService;
    private static _axios: AxiosInstance;


    public static get instance(): AxiosService {
        if (!AxiosService._instance) {
            AxiosService._instance = new AxiosService();
        }
        return AxiosService._instance;
    }

    // Private Properties

    private readonly _rateLimitManager: RateLimitManager;

    // Life Cycle

    private constructor() {
        this._rateLimitManager = RateLimitManager.instance;
        this.initializeAxios();
    }
    
    
    
    private initializeAxios(): void {
        const axiosInstance = axios.create({
            baseURL: 'https://www.pathofexile.com',
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'DrimoZ\'s Currency Fetcher/0.0.1 (Contact: drimozbe@gmail.com)'
            },
        });
        
        axiosInstance.interceptors.request.use(
            (config) => {
                return config;
            },
            (error) => Promise.reject(error)
        );
        
        axiosInstance.interceptors.response.use(
            (response) => {
                if (response.headers) {
                    this._rateLimitManager.updateRateLimitsFromHeader(response.headers as AxiosResponseHeaders);
                }
                return response;
            },
            (error) => {
                console.error('Error:', error);
                return Promise.reject(error);
            }
        );
        
        AxiosService._axios = axiosInstance;
    }
    
    public request(config: AxiosRequestConfig): Promise<unknown> {
        return AxiosService._axios.request(config);
    }
    
    public get(url: string, config?: AxiosRequestConfig): Promise<unknown> {
        return this.request({ url, method: 'GET', ...config });
    }
    
    public post(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<unknown> {
        return this.request({ url, method: 'POST', data, ...config });
    }
}

export { AxiosService };
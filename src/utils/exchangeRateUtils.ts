/**
 * 汇率获取工具 - 使用 exchangerate-api.com v6 API
 * 
 * 功能特点：
 * 1. 从环境变量读取 API Key (EXPO_PUBLIC_EXCHANGE_RATE_API_KEY)
 * 2. 默认以 AUD 为基础货币，获取对 CNY 的汇率
 * 3. 汇率数据缓存24小时
 * 4. App启动时自动检查更新
 * 
 * API 文档：https://www.exchangerate-api.com/docs/overview
 */

// API 配置
const EXCHANGE_RATE_API_BASE = 'https://v6.exchangerate-api.com/v6';
const API_KEY = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;

// 缓存配置
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时缓存
const CACHE_KEY_PREFIX = 'exchange_rates_';
const MAIN_CACHE_KEY = `${CACHE_KEY_PREFIX}AUD_CNY`;

interface ExchangeRateResponse {
    result: string;
    documentation: string;
    terms_of_use: string;
    time_last_update_unix: number;
    time_last_update_utc: string;
    time_next_update_unix: number;
    time_next_update_utc: string;
    base_code: string;
    conversion_rates: Record<string, number>;
}

interface CachedRates {
    data: Record<string, number>;
    timestamp: number;
    base: string;
    lastUpdateTime?: string;
}

/**
 * 检查API Key是否有效
 */
const hasValidApiKey = (): boolean => {
    return !!(API_KEY && API_KEY !== 'your-api-key-here' && API_KEY.length > 0);
};

/**
 * 获取指定基础货币的汇率
 * @param baseCurrency 基础货币代码，如 'AUD', 'USD', 'CNY'
 * @returns 汇率对象，键为货币代码，值为汇率
 */
export const fetchExchangeRates = async (baseCurrency: string = 'AUD'): Promise<Record<string, number>> => {
    try {
        // 检查缓存
        const cacheKey = `${CACHE_KEY_PREFIX}${baseCurrency}`;
        const cached = await getCachedRates(cacheKey);
        
        if (cached && isCacheValid(cached)) {
            console.warn(`Using cached exchange rates for ${baseCurrency}`);
            return cached.data;
        }

        
        // 检查 API Key
        if (!hasValidApiKey()) {
            console.warn('No valid API key provided in environment variables, using default rates');
            return getDefaultRates(baseCurrency);
        }
        
        // 从 API 获取汇率
        const response = await fetch(`${EXCHANGE_RATE_API_BASE}/${API_KEY}/latest/${baseCurrency}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ExchangeRateResponse = await response.json();
        
        // 检查 API 响应状态
        if (data.result !== 'success') {
            throw new Error(`API error: ${data.result}`);
        }
        
        // 缓存结果
        const cacheData: CachedRates = {
            data: data.conversion_rates,
            timestamp: Date.now(),
            base: baseCurrency,
            lastUpdateTime: data.time_last_update_utc
        };
        
        await setCachedRates(cacheKey, cacheData);
        
        return data.conversion_rates;
        
    } catch (error) {
        console.warn('Failed to fetch exchange rates:', error);
        
        // 如果有缓存数据，即使过期也返回
        const cacheKey = `${CACHE_KEY_PREFIX}${baseCurrency}`;
        const cached = await getCachedRates(cacheKey);
        if (cached) {
            console.warn('Using expired cached rates as fallback');
            return cached.data;
        }
        
        // 最后的备选方案：返回默认汇率
        return getDefaultRates(baseCurrency);
    }
};

/**
 * 获取以 AUD 为基础的汇率，重点关注 CNY 汇率
 * @returns 以 AUD 为基础的汇率对象，包含 CNY 等货币汇率
 */
export const fetchCNYRates = async (): Promise<Record<string, number>> => {
    // 直接获取以 AUD 为基础的汇率
    const rates = await fetchExchangeRates('AUD');
    
    // 返回原始汇率，其中 rates.CNY 表示 1 AUD = X CNY
    return rates;
};

/**
 * 获取 AUD 对 CNY 的汇率
 * @returns 汇率 (1 AUD = X CNY)
 */
export const getAUDToCNYRate = async (): Promise<number> => {
    try {
        const rates = await fetchExchangeRates('AUD');
        return rates.CNY || 5.0; // 默认值 5.0
    } catch (error) {
        console.warn('Failed to get AUD to CNY rate:', error);
        return 5.0; // 默认汇率
    }
};

/**
 * App启动时检查并更新汇率
 * 如果距离上次更新超过24小时，自动获取最新数据
 */
export const checkAndUpdateRatesOnAppStart = async (): Promise<void> => {
    try {
        console.log('Checking exchange rates on app start...');
        
        const cached = await getCachedRates(MAIN_CACHE_KEY);
        
        if (!cached) {
            console.log('No cached rates found, fetching fresh data...');
            await fetchExchangeRates('AUD');
            return;
        }
        
        const isExpired = !isCacheValid(cached);
        if (isExpired) {
            console.log('Cached rates expired, fetching fresh data...');
            await fetchExchangeRates('AUD');
        } else {
            console.log('Using valid cached exchange rates');
        }
    } catch (error) {
        console.warn('Failed to check/update rates on app start:', error);
    }
};

/**
 * 获取当前缓存的汇率数据
 * @returns 当前缓存的汇率，如果没有则返回默认汇率
 */
export const getCurrentCachedRates = async (): Promise<Record<string, number>> => {
    try {
        const cached = await getCachedRates(MAIN_CACHE_KEY);
        if (cached) {
            return cached.data;
        }
    } catch (error) {
        console.warn('Failed to get cached rates:', error);
    }
    
    // 返回默认汇率
    return getDefaultRates('AUD');
};

/**
 * 获取特定货币对 CNY 的汇率
 * @param currency 货币代码
 * @returns 汇率 (1 currency = X CNY)
 */
export const getCurrencyToCNYRate = async (currency: string): Promise<number> => {
    if (currency.toUpperCase() === 'CNY') {
        return 1;
    }
    
    try {
        // 直接获取以该货币为基础的汇率
        const rates = await fetchExchangeRates(currency);
        return rates.CNY || 1;
    } catch (error) {
        console.warn(`Failed to get ${currency} to CNY rate:`, error);
        // 返回默认汇率
        const defaults = getDefaultRates('CNY');
        return defaults[currency.toUpperCase()] || 1;
    }
};

/**
 * 检查缓存是否有效
 */
const isCacheValid = (cached: CachedRates): boolean => {
    return (Date.now() - cached.timestamp) < CACHE_DURATION;
};

/**
 * 获取缓存的汇率数据
 */
const getCachedRates = async (cacheKey: string): Promise<CachedRates | null> => {
    try {
        // 这里应该使用你的存储服务
        const { getLocal } = await import('@/services/storageService');
        return await getLocal<CachedRates>(cacheKey);
    } catch (error) {
        return null;
    }
};

/**
 * 缓存汇率数据
 */
const setCachedRates = async (cacheKey: string, data: CachedRates): Promise<void> => {
    try {
        const { setLocal } = await import('@/services/storageService');
        await setLocal(cacheKey, data);
    } catch (error) {
        console.warn('Failed to cache exchange rates:', error);
    }
};

/**
 * 获取默认汇率（备用方案）
 */
const getDefaultRates = (baseCurrency: string): Record<string, number> => {
    const defaultRates: Record<string, Record<string, number>> = {
        AUD: {
            CNY: 4.7,   // 1 AUD = 4.7 CNY (更接近实际汇率)
            USD: 0.67,  // 1 AUD = 0.67 USD
            EUR: 0.62,  // 1 AUD = 0.62 EUR
            GBP: 0.53,  // 1 AUD = 0.53 GBP
            JPY: 98.5,  // 1 AUD = 98.5 JPY
            KRW: 890,   // 1 AUD = 890 KRW
            HKD: 5.2,   // 1 AUD = 5.2 HKD
            SGD: 0.90,  // 1 AUD = 0.90 SGD
        },
        CNY: {
            AUD: 0.2,   // 1 CNY = 0.2 AUD
            USD: 0.14,  // 1 CNY = 0.14 USD
            EUR: 0.13,  // 1 CNY = 0.13 EUR
            GBP: 0.11,  // 1 CNY = 0.11 GBP
            JPY: 20.5,  // 1 CNY = 20.5 JPY
            KRW: 185,   // 1 CNY = 185 KRW
            HKD: 1.1,   // 1 CNY = 1.1 HKD
            SGD: 0.19,  // 1 CNY = 0.19 SGD
        },
        USD: {
            AUD: 1.49,  // 1 USD = 1.49 AUD
            CNY: 7.2,   // 1 USD = 7.2 CNY
            EUR: 0.92,  // 1 USD = 0.92 EUR
            GBP: 0.79,  // 1 USD = 0.79 GBP
            JPY: 148,   // 1 USD = 148 JPY
            KRW: 1340,  // 1 USD = 1340 KRW
            HKD: 7.8,   // 1 USD = 7.8 HKD
            SGD: 1.35,  // 1 USD = 1.35 SGD
        }
    };
    
    return defaultRates[baseCurrency] || defaultRates.AUD;
};

/**
 * 格式化汇率更新时间
 */
export const getLastUpdateTime = async (baseCurrency: string = 'AUD'): Promise<string | null> => {
    try {
        const cacheKey = `${CACHE_KEY_PREFIX}${baseCurrency}`;
        const cached = await getCachedRates(cacheKey);
        
        if (cached) {
            // 优先使用 API 返回的更新时间
            if (cached.lastUpdateTime) {
                return new Date(cached.lastUpdateTime).toLocaleString();
            }
            // 备用：使用缓存时间
            return new Date(cached.timestamp).toLocaleString();
        }
        
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * 清除汇率缓存
 */
export const clearExchangeRateCache = async (): Promise<void> => {
    try {
        const { removeLocal } = await import('@/services/storageService');
        
        // 主要清除 AUD 基础的缓存，也包括其他常用货币
        const currencies = ['AUD', 'CNY', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'HKD', 'SGD'];
        
        for (const currency of currencies) {
            const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
            try {
                await removeLocal(cacheKey);
            } catch (e) {
                // 忽略删除失败
            }
        }
        
        console.log('Exchange rate cache cleared');
    } catch (error) {
        console.warn('Failed to clear exchange rate cache:', error);
    }
};

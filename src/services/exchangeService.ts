import { apiPost } from './httpService';

export interface ExchangeRequest {
  from: string;
  to: string;
}

export interface ExchangeResponse {
  from: string;
  to: string;
  rate: number;
  updated?: string;
  source?: string;
}

export async function getExchangeRate(from: string, to: string): Promise<ExchangeResponse> {
  try {
  const payload: ExchangeRequest = { from, to };
  // Use relative path; httpService will resolve against API_BASE
  // Backend returns { ok: boolean, data: ExchangeResponse }
  const wrapped = await apiPost<{ ok: boolean; data: ExchangeResponse }>('/exchange-rate', payload);
  return wrapped.data;
  } catch (err) {
    // bubble up error for caller to handle
    throw err;
  }
}

export default { getExchangeRate };

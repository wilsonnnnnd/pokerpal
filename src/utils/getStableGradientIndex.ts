import { Gradients } from '@/constants';

export function getStableGradientIndex(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // 转成 32bit 整数
  }
  return Math.abs(hash) % Gradients.length;
}

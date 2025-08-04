'use server';

import {
  detectRevenueDiscrepancy,
  type RevenueDiscrepancyInput,
} from '@/ai/flows/revenue-discrepancy-detection';

export async function checkDiscrepancy(data: RevenueDiscrepancyInput) {
  try {
    const result = await detectRevenueDiscrepancy(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error in checkDiscrepancy action:', error);
    return { success: false, error: 'Failed to analyze discrepancy due to an internal error.' };
  }
}

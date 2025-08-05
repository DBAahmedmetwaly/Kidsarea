'use server';
/**
 * @fileOverview This file contains a Genkit flow for detecting potential revenue discrepancies using generative AI.
 *
 * - detectRevenueDiscrepancy - A function that takes in expected and actual revenue, and returns a discrepancy analysis.
 * - RevenueDiscrepancyInput - The input type for the detectRevenueDiscrepancy function.
 * - RevenueDiscrepancyOutput - The return type for the detectRevenueDiscrepancy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RevenueDiscrepancyInputSchema = z.object({
  expectedRevenue: z
    .number()
    .describe('The expected revenue for the shift.'),
  actualRevenue: z.number().describe('The actual revenue collected during the shift.'),
  shiftDetails: z.string().describe('Details about the shift, such as the date, time, and employees present.'),
  branchName: z.string().describe('The name of the branch where the shift took place.'),
});
export type RevenueDiscrepancyInput = z.infer<typeof RevenueDiscrepancyInputSchema>;

const RevenueDiscrepancyOutputSchema = z.object({
  hasDiscrepancy: z.boolean().describe('Whether or not there is a significant discrepancy between expected and actual revenue.'),
  discrepancyAnalysis: z.string().describe('An analysis of the potential discrepancy, including possible causes and recommendations.'),
});
export type RevenueDiscrepancyOutput = z.infer<typeof RevenueDiscrepancyOutputSchema>;

export async function detectRevenueDiscrepancy(input: RevenueDiscrepancyInput): Promise<RevenueDiscrepancyOutput> {
  return detectRevenueDiscrepancyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'revenueDiscrepancyPrompt',
  input: {schema: RevenueDiscrepancyInputSchema},
  output: {schema: RevenueDiscrepancyOutputSchema},
  prompt: `You are an expert financial analyst specializing in detecting revenue discrepancies in kids’ play areas.

You will use the provided information to determine if there is a significant discrepancy between the expected and actual revenue for a shift. If there is a discrepancy, you will analyze the potential causes and provide recommendations for further investigation.

Expected Revenue: {{{expectedRevenue}}}
Actual Revenue: {{{actualRevenue}}}
Shift Details: {{{shiftDetails}}}
Branch Name: {{{branchName}}}

Consider factors such as employee errors, theft, incorrect pricing, and unusual business patterns. Set the hasDiscrepancy output field appropriately.
`,
});

const detectRevenueDiscrepancyFlow = ai.defineFlow(
  {
    name: 'detectRevenueDiscrepancyFlow',
    inputSchema: RevenueDiscrepancyInputSchema,
    outputSchema: RevenueDiscrepancyOutputSchema,
  },
  async input => {
    const {output} = await prompt({input});
    return output!;
  }
);

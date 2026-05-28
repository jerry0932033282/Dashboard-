/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FundDataRecord {
  date: string;
  year: number;
  month: string;
  quarter: string;
  subSingle: number;
  subRSP: number;
  totalSub: number;
  redSingle: number;
  redRSP: number;
  totalRed: number;
  netFlow: number;
  aum: number;
  accPending: number;
  accSuccess: number;
  accMissing: number;
  accFailed: number;
  accTotal: number;
  accRate: number;
}

export interface AggregatedRecord {
  label: string;
  subSingle: number;
  subRSP: number;
  totalSub: number;
  redSingle: number;
  redRSP: number;
  totalRed: number;
  netFlow: number;
  aum: number;
  accPending: number;
  accSuccess: number;
  accMissing: number;
  accFailed: number;
  accTotal: number;
  accRate: number;
}

export type Timeframe = 'daily' | 'monthly' | 'quarterly' | 'yearly';

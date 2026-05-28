/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FundDataRecord } from './types';

export function generateSeedData(): FundDataRecord[] {
  const records: FundDataRecord[] = [];
  const startDate = new Date('2025-01-01');
  // We populate up to May 28, 2026
  const endDate = new Date('2026-05-28');
  const currentDate = new Date(startDate);
  
  let baseAUM = 45.2; // 45.2 billion TWD
  let totalAccSuccess = 12500;
  let totalAccPending = 450;
  let totalAccMissing = 320;
  let totalAccFailed = 180;

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const multiplier = isWeekend ? 0.05 : 1.0;

    // Simulate daily inflows (Single Purchase vs Regular Saving Plan RSP)
    let subSingle = Math.round((200 + Math.random() * 400) * multiplier);
    let subRSP = Math.round((150 + Math.random() * 250) * multiplier);

    // Regular Saving Plan concentrations on 6th, 16th, and 26th of each month
    if (!isWeekend && [6, 16, 26].includes(currentDate.getDate())) {
      subRSP += Math.round(600 + Math.random() * 400);
    }

    // Redemptions (Single vs Regular)
    let redSingle = Math.round((180 + Math.random() * 350) * multiplier);
    let redRSP = Math.round((80 + Math.random() * 150) * multiplier);

    let totalSub = subSingle + subRSP;
    let totalRed = redSingle + redRSP;
    let netFlow = totalSub - totalRed;

    // Market rate drift (random walk model) + net flows impact on AUM
    const marketReturn = 1 + ((Math.random() * 1.1 - 0.5) / 100);
    baseAUM = (baseAUM * marketReturn) + (netFlow / 10000); // 10000 万 is 1 億
    if (baseAUM < 10) baseAUM = 10;

    // Accounts funnel statistics
    const newPending = isWeekend ? Math.round(Math.random() * 5) : Math.round(15 + Math.random() * 40);
    const resolvedPending = isWeekend ? 0 : Math.round(newPending * 0.95);

    const newSuccess = Math.round(resolvedPending * 0.82);
    const newMissing = Math.round(resolvedPending * 0.12);
    const newFailed = resolvedPending - newSuccess - newMissing;

    totalAccPending += (newPending - resolvedPending);
    totalAccSuccess += newSuccess;
    totalAccMissing += newMissing;
    totalAccFailed += newFailed;

    const totalAccTotal = totalAccPending + totalAccSuccess + totalAccMissing + totalAccFailed;
    const completionRate = totalAccTotal > 0 ? (totalAccSuccess / totalAccTotal * 100) : 0;

    records.push({
      date: dateStr,
      year: currentDate.getFullYear(),
      month: String(currentDate.getMonth() + 1).padStart(2, '0'),
      quarter: 'Q' + Math.floor((currentDate.getMonth() + 3) / 3),
      subSingle,
      subRSP,
      totalSub,
      redSingle,
      redRSP,
      totalRed,
      netFlow,
      aum: parseFloat(baseAUM.toFixed(4)),
      accPending: totalAccPending,
      accSuccess: totalAccSuccess,
      accMissing: totalAccMissing,
      accFailed: totalAccFailed,
      accTotal: totalAccTotal,
      accRate: parseFloat(completionRate.toFixed(2)),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return records;
}

export function generateNextDayRecord(prevRecord: FundDataRecord): FundDataRecord {
  const lastDateObj = new Date(prevRecord.date);
  lastDateObj.setDate(lastDateObj.getDate() + 1);

  const dateStr = lastDateObj.toISOString().split('T')[0];
  const dayOfWeek = lastDateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const multiplier = isWeekend ? 0.05 : 1.0;

  let subSingle = Math.round((210 + Math.random() * 430) * multiplier);
  let subRSP = Math.round((140 + Math.random() * 260) * multiplier);

  if (!isWeekend && [6, 16, 26].includes(lastDateObj.getDate())) {
    subRSP += Math.round(550 + Math.random() * 380);
  }

  let redSingle = Math.round((170 + Math.random() * 340) * multiplier);
  let redRSP = Math.round((75 + Math.random() * 160) * multiplier);

  let totalSub = subSingle + subRSP;
  let totalRed = redSingle + redRSP;
  let netFlow = totalSub - totalRed;

  const marketReturn = 1 + ((Math.random() * 1.0 - 0.45) / 100);
  let nextAUM = parseFloat(((prevRecord.aum * marketReturn) + (netFlow / 10000)).toFixed(4));
  if (nextAUM < 10) nextAUM = 10;

  const newPending = isWeekend ? Math.round(Math.random() * 8) : Math.round(20 + Math.random() * 50);
  const resolvedPending = isWeekend ? 0 : Math.round(newPending * 0.96);

  const newSuccess = Math.round(resolvedPending * 0.85);
  const newMissing = Math.round(resolvedPending * 0.10);
  const newFailed = resolvedPending - newSuccess - newMissing;

  const nextPending = prevRecord.accPending + newPending - resolvedPending;
  const nextSuccess = prevRecord.accSuccess + newSuccess;
  const nextMissing = prevRecord.accMissing + newMissing;
  const nextFailed = prevRecord.accFailed + newFailed;
  const nextTotal = nextPending + nextSuccess + nextMissing + nextFailed;
  const nextRate = parseFloat((nextSuccess / nextTotal * 100).toFixed(2));

  return {
    date: dateStr,
    year: lastDateObj.getFullYear(),
    month: String(lastDateObj.getMonth() + 1).padStart(2, '0'),
    quarter: 'Q' + Math.floor((lastDateObj.getMonth() + 3) / 3),
    subSingle,
    subRSP,
    totalSub,
    redSingle,
    redRSP,
    totalRed,
    netFlow,
    aum: nextAUM,
    accPending: nextPending,
    accSuccess: nextSuccess,
    accMissing: nextMissing,
    accFailed: nextFailed,
    accTotal: nextTotal,
    accRate: nextRate,
  };
}

import { db } from '../config/database.js';

export function getSalaryCycleInfo(consultantId: number, refDate: Date = new Date()) {
  try {
    const cutoffDaySetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'salary_cutoff_day'").get() as { value: string } | undefined;
    const cutoffDay = cutoffDaySetting ? parseInt(cutoffDaySetting.value) : 25;
    
    const payoutDaySetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'salary_payout_day'").get() as { value: string } | undefined;
    const payoutDay = payoutDaySetting ? parseInt(payoutDaySetting.value) : 7;

    const today = refDate;
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDay = today.getDate();

    let prevCycleStart: Date;
    let prevCycleEnd: Date;
    let currentCycleStart: Date;
    let currentCycleEnd: Date;

    if (currentDay > cutoffDay) {
      // Current cycle: from cutoffDay + 1 of this month to cutoffDay of next month
      currentCycleStart = new Date(currentYear, currentMonth, cutoffDay + 1, 0, 0, 0, 0);
      currentCycleEnd = new Date(currentYear, currentMonth + 1, cutoffDay, 23, 59, 59, 999);

      // Prev cycle: from cutoffDay + 1 of last month to cutoffDay of this month
      prevCycleStart = new Date(currentYear, currentMonth - 1, cutoffDay + 1, 0, 0, 0, 0);
      prevCycleEnd = new Date(currentYear, currentMonth, cutoffDay, 23, 59, 59, 999);
    } else {
      // Current cycle: from cutoffDay + 1 of last month to cutoffDay of this month
      currentCycleStart = new Date(currentYear, currentMonth - 1, cutoffDay + 1, 0, 0, 0, 0);
      currentCycleEnd = new Date(currentYear, currentMonth, cutoffDay, 23, 59, 59, 999);

      // Prev cycle: from cutoffDay + 1 of 2 months ago to cutoffDay of last month
      prevCycleStart = new Date(currentYear, currentMonth - 2, cutoffDay + 1, 0, 0, 0, 0);
      prevCycleEnd = new Date(currentYear, currentMonth - 1, cutoffDay, 23, 59, 59, 999);
    }

    const sessions = db.prepare("SELECT consultant_earnings, created_at FROM sessions WHERE consultant_id = ? AND status = 'completed'").all(consultantId) as any[];

    let prevCycleEarnings = 0;
    let currentCycleEarnings = 0;

    for (const s of sessions) {
      const sDate = new Date(s.created_at);
      if (sDate >= prevCycleStart && sDate <= prevCycleEnd) {
        prevCycleEarnings += s.consultant_earnings;
      }
      if (sDate >= currentCycleStart && sDate <= currentCycleEnd) {
        currentCycleEarnings += s.consultant_earnings;
      }
    }

    let payoutMonthIndex = currentDay > cutoffDay ? currentMonth + 1 : currentMonth;
    const payoutDate = new Date(currentYear, payoutMonthIndex, payoutDay);
    
    return {
      cutoffDay,
      payoutDay,
      prevCycleStart: prevCycleStart.toISOString(),
      prevCycleEnd: prevCycleEnd.toISOString(),
      currentCycleStart: currentCycleStart.toISOString(),
      currentCycleEnd: currentCycleEnd.toISOString(),
      prevCycleEarnings,
      currentCycleEarnings,
      payoutDate: payoutDate.toISOString(),
      payoutMonthName: payoutDate.toLocaleString('default', { month: 'long' })
    };
  } catch (err) {
    console.error('Error calculating salary info:', err);
    return {
      cutoffDay: 25,
      payoutDay: 7,
      prevCycleStart: new Date().toISOString(),
      prevCycleEnd: new Date().toISOString(),
      currentCycleStart: new Date().toISOString(),
      currentCycleEnd: new Date().toISOString(),
      prevCycleEarnings: 0,
      currentCycleEarnings: 0,
      payoutDate: new Date().toISOString(),
      payoutMonthName: 'next month'
    };
  }
}

export function checkAndResetMonthlyWallets() {
  try {
    const cutoffDaySetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'salary_cutoff_day'").get() as { value: string } | undefined;
    const cutoffDay = cutoffDaySetting ? parseInt(cutoffDaySetting.value) : 25;

    const today = new Date();
    const currentDay = today.getDate();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    if (currentDay > cutoffDay) {
      const lastResetSetting = db.prepare("SELECT value FROM admin_settings WHERE key = 'last_wallet_reset_month'").get() as { value: string } | undefined;
      const lastResetMonth = lastResetSetting?.value;

      if (lastResetMonth !== currentYearMonth) {
        console.log(`[Wallet Engine] Current day ${currentDay} is past cutoff day ${cutoffDay}. Resetting wallet_monthly for all consultants to 0 for cycle: ${currentYearMonth}`);
        db.prepare("UPDATE consultants SET wallet_monthly = 0").run();
        db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('last_wallet_reset_month', ?)").run(currentYearMonth);
      }
    }
  } catch (err) {
    console.error('Error resetting monthly wallets:', err);
  }
}

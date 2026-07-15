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

export function recalculateConsultantWallet(consultantId: number) {
  try {
    // 1. Get the current consultant record
    const consultant = db.prepare("SELECT wallet_total, wallet_withdrawable, wallet_today, wallet_monthly, lifetime_revenue, total_sessions, display_name FROM consultants WHERE id = ?").get(consultantId) as any;
    if (!consultant) return;

    // 2. Calculate the actual lifetime revenue and completed sessions count from sessions table
    const sessionsStats = db.prepare("SELECT SUM(consultant_earnings) as total, COUNT(*) as count FROM sessions WHERE consultant_id = ? AND status = 'completed'").get(consultantId) as { total: number | null; count: number };
    const actualLifetimeRevenue = sessionsStats?.total || 0;
    const actualCompletedSessionsCount = sessionsStats?.count || 0;

    // 3. Get manual adjustments sum
    const adjSum = db.prepare("SELECT SUM(amount) as total FROM manual_wallet_adjustments WHERE target_type = 'consultant' AND target_id = ?").get(consultantId) as { total: number | null; count: number };
    const totalAdjustments = adjSum?.total || 0;

    // 4. Get payouts from audit logs (re-calculating payouts dynamically)
    const oldId1 = consultantId - 20000;
    const oldId2 = consultantId - 10000;
    const payouts = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE (action = 'Salary Disbursed' OR action = 'Approve Payout') 
        AND (details LIKE ? OR details LIKE ? OR details LIKE ?)
    `).all(`%#${consultantId}%`, `%#${oldId1}%`, `%${consultant.display_name}%`) as any[];
    
    let totalPayouts = 0;
    for (const p of payouts) {
      const match = p.details.match(/(?:Approved ₹|payout of ₹)([0-9,.]+)/i);
      if (match) {
        const amtStr = match[1].replace(/,/g, '');
        totalPayouts += parseFloat(amtStr);
      }
    }

    // 5. If consultant has real completed sessions, we set their wallet columns directly to the absolute math!
    if (actualCompletedSessionsCount > 0) {
      const newLifetimeRevenue = actualLifetimeRevenue;
      const newWalletTotal = actualLifetimeRevenue + totalAdjustments;
      const newWalletWithdrawable = Math.max(0, newWalletTotal - totalPayouts);

      db.prepare(`
        UPDATE consultants
        SET lifetime_revenue = ?,
            wallet_total = ?,
            wallet_withdrawable = ?,
            total_sessions = MAX(total_sessions, ?)
        WHERE id = ?
      `).run(newLifetimeRevenue, newWalletTotal, newWalletWithdrawable, actualCompletedSessionsCount, consultantId);
    }

    // 6. Recalculate wallet_today dynamically based on the current calendar day in Asia/Kolkata (IST)
    const now = new Date();
    const istFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayIST = istFormatter.format(now);

    const completedSessions = db.prepare("SELECT consultant_earnings, created_at FROM sessions WHERE consultant_id = ? AND status = 'completed'").all(consultantId) as any[];
    
    let wallet_today = 0;
    for (const s of completedSessions) {
      const sDate = new Date(s.created_at);
      if (istFormatter.format(sDate) === todayIST) {
        wallet_today += s.consultant_earnings;
      }
    }

    // 5. Recalculate wallet_monthly using active billing cycle (from getSalaryCycleInfo)
    const salaryInfo = getSalaryCycleInfo(consultantId);
    const wallet_monthly = salaryInfo.currentCycleEarnings;

    // 6. Update today's and monthly earnings in the database
    db.prepare(`
      UPDATE consultants
      SET wallet_today = ?,
          wallet_monthly = ?
      WHERE id = ?
    `).run(wallet_today, wallet_monthly, consultantId);

  } catch (err) {
    console.error(`[Wallet Sync] Error recalculating wallet for consultant ${consultantId}:`, err);
  }
}

export function recalculateAllConsultantWallets() {
  try {
    const consultants = db.prepare("SELECT id FROM consultants").all() as { id: number }[];
    console.log(`[Wallet Sync] Starting full wallet recalculation for ${consultants.length} consultants...`);
    for (const c of consultants) {
      recalculateConsultantWallet(c.id);
    }
    console.log(`[Wallet Sync] Full wallet recalculation completed successfully.`);
  } catch (err) {
    console.error(`[Wallet Sync] Error during full wallet recalculation:`, err);
  }
}

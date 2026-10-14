export interface PayoutMilestone {
  viewThreshold: number;
  payout: number;
}

export interface PayoutCalculation {
  views: number;
  highestMilestonePayout: number;
}

export interface BudgetAllocation {
  additionalPayout: number;
  totalPayout: number;
  remainingBudget: number;
}

export function calculatePayout(
  views: number,
  milestones: PayoutMilestone[]
): PayoutCalculation {
  if (!Number.isSafeInteger(views) || views < 0) {
    throw new Error("INVALID_VIEW_COUNT");
  }

  if (milestones.length === 0) {
    throw new Error("MILESTONES_REQUIRED");
  }

  let highestMilestonePayout = 0;
  let previousThreshold = 0;
  let previousPayout = 0;

  for (const milestone of milestones) {
    if (
      !Number.isSafeInteger(milestone.viewThreshold) ||
      milestone.viewThreshold <= previousThreshold ||
      !Number.isSafeInteger(milestone.payout) ||
      milestone.payout <= 0 ||
      milestone.payout < previousPayout
    ) {
      throw new Error("INVALID_MILESTONES");
    }

    previousThreshold = milestone.viewThreshold;
    previousPayout = milestone.payout;

    if (views >= milestone.viewThreshold) {
      highestMilestonePayout = milestone.payout;
    } else {
      break;
    }
  }

  return {
    views,
    highestMilestonePayout,
  };
}

export function calculateBudgetAllocation(
  highestMilestonePayout: number,
  alreadyPaid: number,
  remainingBudget: number
): BudgetAllocation {
  const values = [
    highestMilestonePayout,
    alreadyPaid,
    remainingBudget,
  ];

  if (
    values.some(
      (value) => !Number.isSafeInteger(value) || value < 0
    ) ||
    alreadyPaid > highestMilestonePayout
  ) {
    throw new Error("INVALID_BUDGET_ALLOCATION");
  }

  const additionalPayout = Math.min(
    highestMilestonePayout - alreadyPaid,
    remainingBudget
  );

  return {
    additionalPayout,
    totalPayout: alreadyPaid + additionalPayout,
    remainingBudget: remainingBudget - additionalPayout,
  };
}
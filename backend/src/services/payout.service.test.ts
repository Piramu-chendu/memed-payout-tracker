import { describe, expect, it } from "@jest/globals";
import { calculateBudgetAllocation } from "./payout.service";
import {
  calculatePayout,
  PayoutMilestone,
} from "./payout.service";

const milestones: PayoutMilestone[] = [
  { viewThreshold: 10_000, payout: 500 },
  { viewThreshold: 50_000, payout: 2_000 },
  { viewThreshold: 100_000, payout: 5_000 },
];

describe("calculatePayout", () => {
  it("returns zero when no milestone is reached", () => {
    expect(calculatePayout(5_000, milestones)).toEqual({
      views: 5_000,
      highestMilestonePayout: 0,
    });
  });

  it("pays the first milestone at the exact threshold", () => {
    expect(calculatePayout(10_000, milestones)).toEqual({
      views: 10_000,
      highestMilestonePayout: 500,
    });
  });

  it("keeps the highest crossed milestone payout", () => {
    expect(calculatePayout(30_000, milestones)).toEqual({
      views: 30_000,
      highestMilestonePayout: 500,
    });
  });

  it("selects the second milestone at its exact threshold", () => {
    expect(calculatePayout(50_000, milestones)).toEqual({
      views: 50_000,
      highestMilestonePayout: 2_000,
    });
  });

  it("selects the highest milestone when one update crosses several milestones", () => {
    expect(calculatePayout(100_000, milestones)).toEqual({
      views: 100_000,
      highestMilestonePayout: 5_000,
    });
  });

  it("does not increase the payout beyond the highest milestone", () => {
    expect(calculatePayout(250_000, milestones)).toEqual({
      views: 250_000,
      highestMilestonePayout: 5_000,
    });
  });

  it("accepts zero views", () => {
    expect(calculatePayout(0, milestones)).toEqual({
      views: 0,
      highestMilestonePayout: 0,
    });
  });

  it("rejects negative view counts", () => {
    expect(() => calculatePayout(-1, milestones)).toThrow(
      "INVALID_VIEW_COUNT"
    );
  });

  it("rejects fractional view counts", () => {
    expect(() => calculatePayout(10_000.5, milestones)).toThrow(
      "INVALID_VIEW_COUNT"
    );
  });

  it("rejects an empty milestone ladder", () => {
    expect(() => calculatePayout(10_000, [])).toThrow(
      "MILESTONES_REQUIRED"
    );
  });

  it("rejects milestones with decreasing payouts", () => {
    expect(() =>
      calculatePayout(100_000, [
        { viewThreshold: 10_000, payout: 500 },
        { viewThreshold: 50_000, payout: 400 },
      ])
    ).toThrow("INVALID_MILESTONES");
  });

  it("rejects milestones with unordered thresholds", () => {
    expect(() =>
      calculatePayout(100_000, [
        { viewThreshold: 50_000, payout: 2_000 },
        { viewThreshold: 10_000, payout: 500 },
      ])
    ).toThrow("INVALID_MILESTONES");
  });
});

describe("calculateBudgetAllocation", () => {
  it("allocates the full milestone payout when budget is sufficient", () => {
    expect(calculateBudgetAllocation(5_000, 500, 10_000)).toEqual({
      additionalPayout: 4_500,
      totalPayout: 5_000,
      remainingBudget: 5_500,
    });
  });

  it("caps allocation at the remaining campaign budget", () => {
    expect(calculateBudgetAllocation(5_000, 0, 1_000)).toEqual({
      additionalPayout: 1_000,
      totalPayout: 1_000,
      remainingBudget: 0,
    });
  });

  it("does not pay twice when the milestone is already fully paid", () => {
    expect(calculateBudgetAllocation(5_000, 5_000, 10_000)).toEqual({
      additionalPayout: 0,
      totalPayout: 5_000,
      remainingBudget: 10_000,
    });
  });

  it("allocates nothing when the campaign budget is exhausted", () => {
    expect(calculateBudgetAllocation(5_000, 0, 0)).toEqual({
      additionalPayout: 0,
      totalPayout: 0,
      remainingBudget: 0,
    });
  });

  it("rejects negative budget values", () => {
    expect(() => calculateBudgetAllocation(5_000, 0, -1)).toThrow(
      "INVALID_BUDGET_ALLOCATION"
    );
  });

  it("rejects an already-paid amount greater than the milestone payout", () => {
    expect(() => calculateBudgetAllocation(500, 1_000, 5_000)).toThrow(
      "INVALID_BUDGET_ALLOCATION"
    );
  });
});
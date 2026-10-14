const API = process.env.API_BASE_URL || "http://localhost:5000";
const brandToken = process.env.BRAND_TOKEN;
const creatorToken = process.env.CREATOR_TOKEN;

if (!brandToken || !creatorToken) {
  throw new Error(
    "Set BRAND_TOKEN and CREATOR_TOKEN before running this test."
  );
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const body = await response.json();

  if (!response.ok || body.success !== true) {
    throw new Error(
      `${options.method || "GET"} ${path} failed (${response.status}): ` +
      JSON.stringify(body)
    );
  }

  return body;
}

function auth(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function main() {
  // Create an isolated campaign specifically for this test.
  const createdCampaign = await request("/api/campaigns", {
    method: "POST",
    headers: auth(brandToken),
    body: JSON.stringify({
      name: `Concurrency Test ${Date.now()}`,
      platform: "instagram",
      totalBudget: 1000,
      milestones: [
        { viewThreshold: 1000, payout: 1000 },
      ],
    }),
  });

  const campaign = createdCampaign.campaign;

  // Create two different submissions.
  const submissions = await Promise.all(
    ["CONCURRENCY_A", "CONCURRENCY_B"].map(async (suffix) => {
      const response = await request("/api/submissions", {
        method: "POST",
        headers: auth(creatorToken),
        body: JSON.stringify({
          campaignId: campaign.id,
          postUrl: `https://www.instagram.com/reel/${suffix}_${Date.now()}_${Math.random().toString(36).slice(2)}/`,
        }),
      });

      return response.submission;
    })
  );

  // Both posts attempt to earn the full budget simultaneously.
  const updates = await Promise.all(
    submissions.map((submission) =>
      request(`/api/submissions/${submission._id}/views`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ views: 1000 }),
      })
    )
  );

  const allocated = updates.reduce(
    (sum, response) => sum + response.result.additionalPayout,
    0
  );

  const brandCampaigns = await request("/api/campaigns/mine", {
    headers: auth(brandToken),
  });

  const finalCampaign = brandCampaigns.campaigns.find(
    (item) => item.id === campaign.id
  );

  if (!finalCampaign) {
    throw new Error("Test campaign was not found in the brand dashboard.");
  }

  console.log(JSON.stringify({
    campaignId: campaign.id,
    budget: finalCampaign.totalBudget,
    spent: finalCampaign.spentAmount,
    remaining: finalCampaign.remainingBudget,
    totalAllocatedByConcurrentRequests: allocated,
    individualAdditionalPayouts: updates.map(
      (response) => response.result.additionalPayout
    ),
  }, null, 2));

  if (
    finalCampaign.spentAmount > finalCampaign.totalBudget ||
    finalCampaign.spentAmount !== 1000 ||
    finalCampaign.remainingBudget !== 0 ||
    allocated !== 1000
  ) {
    throw new Error("FAIL: concurrent payout allocation violated the budget invariant.");
  }

  console.log("PASS: concurrent updates respected the campaign budget.");
}

main().catch((error) => {
  console.error("Concurrency test failed:", error.message);
  process.exitCode = 1;
});
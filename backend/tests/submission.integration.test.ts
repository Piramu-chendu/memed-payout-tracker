
import mongoose, { Types } from "mongoose";
import request from "supertest";
import app from "../src/app";
import Campaign from "../src/models/Campaign";
import Submission from "../src/models/Submission";
import User from "../src/models/User";

type SignupResponse = {
  success: boolean;
  token: string;
  user: {
    id: string;
    role: "brand" | "creator";
  };
};

type CampaignResponse = {
  success: boolean;
  campaign: {
    id: string;
    totalBudget: number;
    spentAmount: number;
    status: string;
  };
};

type SubmissionResponse = {
  success: boolean;
  submission: {
    _id: string;
    id?: string;
  };
};

type ViewUpdateResponse = {
  success: boolean;
  result: {
    payoutAmount: number;
    additionalPayout: number;
    campaignSpent: number;
    campaignRemaining: number;
  };
};

const testRunId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2)}`;

const createdUserIds = new Set<string>();
const createdCampaignIds = new Set<string>();
const createdSubmissionIds = new Set<string>();

let brandToken = "";
let creatorToken = "";
let brandId = "";
let creatorId = "";

async function signUp(
  role: "brand" | "creator",
  label: string
): Promise<SignupResponse> {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({
      name: `Integration ${label}`,
      email: `${role}-${label}-${testRunId}@example.test`,
      password: "IntegrationTestPassword123!",
      role,
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(typeof response.body.token).toBe("string");

  const body = response.body as SignupResponse;
  createdUserIds.add(body.user.id);

  return body;
}

async function createCampaign(
  name: string,
  totalBudget: number,
  milestones: Array<{
    viewThreshold: number;
    payout: number;
  }>
): Promise<string> {
  const response = await request(app)
    .post("/api/campaigns")
    .set("Authorization", `Bearer ${brandToken}`)
    .send({
      name,
      platform: "instagram",
      totalBudget,
      milestones,
    });

if (response.status !== 201) {
  throw new Error(
    `Campaign creation failed (${response.status}): ${JSON.stringify(response.body)}`
  );
}

expect(response.body.success).toBe(true);
  const body = response.body as CampaignResponse;
  createdCampaignIds.add(body.campaign.id);

  return body.campaign.id;
}

async function createSubmission(
  campaignId: string,
  postSlug: string
): Promise<string> {
  const response = await request(app)
    .post("/api/submissions")
    .set("Authorization", `Bearer ${creatorToken}`)
    .send({
      campaignId,
      postUrl: `https://www.instagram.com/p/${postSlug}/`,
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);

  const body = response.body as SubmissionResponse;
  const submissionId =
    body.submission._id ?? body.submission.id;

  if (!submissionId) {
    throw new Error("API response did not contain a submission ID");
  }

  createdSubmissionIds.add(submissionId);

  return submissionId;
}

async function updateViews(
  submissionId: string,
  views: number
): Promise<ViewUpdateResponse> {
  const response = await request(app)
    .patch(`/api/submissions/${submissionId}/views`)
    .send({ views });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);

  return response.body as ViewUpdateResponse;
}


beforeAll(async () => {
  console.log("[integration] Starting setup");

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing from the test environment");
  }

  const parsedUri = new URL(uri);
  const databaseName = parsedUri.pathname.replace(/^\/|\/$/g, "");

  if (databaseName !== "memed_payout_tracker_test") {
    throw new Error(
      "Integration tests blocked: unexpected MongoDB database"
    );
  }

  console.log("[integration] Connecting to test database");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  console.log("[integration] Connected database:", mongoose.connection.name);

  if (mongoose.connection.name !== "memed_payout_tracker_test") {
    throw new Error("Connected to an unexpected MongoDB database");
  }

  console.log("[integration] Initializing model indexes");

  await Promise.all([
    User.init(),
    Campaign.init(),
    Submission.init(),
  ]);

  console.log("[integration] Model indexes initialized");

  const brand = await signUp("brand", "brand");
  brandToken = brand.token;
  brandId = brand.user.id;

  console.log("[integration] Brand account created");

  const creator = await signUp("creator", "creator");
  creatorToken = creator.token;
  creatorId = creator.user.id;

  console.log("[integration] Creator account created");
}, 30000);


afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    const userObjectIds = [...createdUserIds].map(
      (id) => new Types.ObjectId(id)
    );
    const campaignObjectIds = [...createdCampaignIds].map(
      (id) => new Types.ObjectId(id)
    );
    const submissionObjectIds = [...createdSubmissionIds].map(
      (id) => new Types.ObjectId(id)
    );

    if (submissionObjectIds.length > 0) {
      await Submission.deleteMany({
        _id: { $in: submissionObjectIds },
      });
    }

    if (campaignObjectIds.length > 0) {
      await Campaign.deleteMany({
        _id: { $in: campaignObjectIds },
        brandId: new Types.ObjectId(brandId),
      });
    }

    if (userObjectIds.length > 0) {
      await User.deleteMany({
        _id: { $in: userObjectIds },
      });
    }

    await mongoose.disconnect();
  }
});

describe("Submission payout integration", () => {
  it("rejects a duplicate post in the same campaign", async () => {
    const campaignId = await createCampaign(
      "Duplicate Submission Test",
      1000,
      [{ viewThreshold: 1000, payout: 100 }]
    );

    const postSlug = `duplicate-${testRunId}`;

    await createSubmission(campaignId, postSlug);

    const response = await request(app)
      .post("/api/submissions")
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({
        campaignId,
        postUrl: `https://www.instagram.com/p/${postSlug}/`,
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("POST_ALREADY_SUBMITTED");
  });

  it("caps payouts at the remaining campaign budget", async () => {

const campaignId = await createCampaign(
  "Budget Cap Integration Test",
  500,
  [
    { viewThreshold: 1000, payout: 200 },
    { viewThreshold: 5000, payout: 500 },
  ]
);


    const firstSubmissionId = await createSubmission(
      campaignId,
      `budget-first-${testRunId}`
    );

    const firstUpdate = await updateViews(firstSubmissionId, 1000);

    expect(firstUpdate.result.additionalPayout).toBe(200);
    expect(firstUpdate.result.campaignSpent).toBe(200);
    expect(firstUpdate.result.campaignRemaining).toBe(300);

    const secondSubmissionId = await createSubmission(
      campaignId,
      `budget-second-${testRunId}`
    );

    const secondUpdate = await updateViews(secondSubmissionId, 5000);

    expect(secondUpdate.result.additionalPayout).toBe(300);
    expect(secondUpdate.result.payoutAmount).toBe(300);
    expect(secondUpdate.result.campaignSpent).toBe(500);
    expect(secondUpdate.result.campaignRemaining).toBe(0);

    const campaign = await Campaign.findById(campaignId).lean();

    expect(campaign?.spentAmount).toBe(500);
    expect(campaign?.spentAmount).toBeLessThanOrEqual(
      campaign?.totalBudget ?? 0
    );
    expect(campaign?.status).toBe("completed");
  });

  it("does not pay twice for a repeated view count", async () => {
    const campaignId = await createCampaign(
      "Repeated Views Integration Test",
      1000,
      [{ viewThreshold: 1000, payout: 250 }]
    );

    const submissionId = await createSubmission(
      campaignId,
      `repeated-${testRunId}`
    );

    const firstUpdate = await updateViews(submissionId, 1000);
    const secondUpdate = await updateViews(submissionId, 1000);

    expect(firstUpdate.result.additionalPayout).toBe(250);
    expect(secondUpdate.result.additionalPayout).toBe(0);
    expect(secondUpdate.result.payoutAmount).toBe(250);
    expect(secondUpdate.result.campaignSpent).toBe(250);
    expect(secondUpdate.result.campaignRemaining).toBe(750);

    const submission = await Submission.findById(submissionId).lean();
    const campaign = await Campaign.findById(campaignId).lean();

    expect(submission?.payoutAmount).toBe(250);
    expect(campaign?.spentAmount).toBe(250);
  });

  it("marks a live campaign completed when its budget is exhausted", async () => {
    const campaignId = await createCampaign(
      "Campaign Completion Integration Test",
      100,
      [{ viewThreshold: 1000, payout: 100 }]
    );

    const submissionId = await createSubmission(
      campaignId,
      `completion-${testRunId}`
    );

    const update = await updateViews(submissionId, 1000);

    expect(update.result.additionalPayout).toBe(100);
    expect(update.result.campaignSpent).toBe(100);
    expect(update.result.campaignRemaining).toBe(0);

    const campaign = await Campaign.findById(campaignId).lean();

    expect(campaign?.status).toBe("completed");
    expect(campaign?.spentAmount).toBe(campaign?.totalBudget);
  });
});

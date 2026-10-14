import request from "supertest";
import app from "../src/app";

describe("GET /api/health", () => {
  it("returns a successful health response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Meme'd Payout Tracker API is running",
    });
  });
});

describe("POST /api/auth/login", () => {
  it("rejects invalid login data with HTTP 400", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "not-an-email",
        password: "",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid login data");
    expect(response.body.errors).toBeInstanceOf(Array);
  });

  it("rejects missing login fields", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid login data");
  });
});

describe("Creator submission API access", () => {
  it("rejects post submissions without authentication", async () => {
    const response = await request(app)
      .post("/api/submissions")
      .send({
        campaignId: "507f1f77bcf86cd799439011",
        postUrl: "https://www.instagram.com/p/testpost/",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Authentication required");
  });

  it("rejects creator earnings requests without authentication", async () => {
    const response = await request(app).get("/api/submissions/earnings");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Authentication required");
  });

  it("rejects creator submission history requests without authentication", async () => {
    const response = await request(app).get("/api/submissions/mine");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Authentication required");
  });
});

describe("View update API validation", () => {
  it("rejects an invalid submission ID", async () => {
    const response = await request(app)
      .patch("/api/submissions/invalid-id/views")
      .send({ views: 1000 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("INVALID_SUBMISSION_ID");
  });

  it("rejects negative view counts", async () => {
    const response = await request(app)
      .patch("/api/submissions/507f1f77bcf86cd799439011/views")
      .send({ views: -1 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid view count");
  });

  it("rejects fractional view counts", async () => {
    const response = await request(app)
      .patch("/api/submissions/507f1f77bcf86cd799439011/views")
      .send({ views: 1000.5 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid view count");
  });

  it("rejects missing view counts", async () => {
    const response = await request(app)
      .patch("/api/submissions/507f1f77bcf86cd799439011/views")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid view count");
  });
});
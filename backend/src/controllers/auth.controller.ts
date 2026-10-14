
import { Request, Response } from "express";
import { ZodError } from "zod";
import { loginSchema, signupSchema } from "../validators/auth.validator";
import { loginUser, signupUser } from "../services/auth.service";

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const data = signupSchema.parse(req.body);
    const result = await signupUser(data);

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid signup data",
        errors: error.issues,
      });
      return;
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
      return;
    }

    if (error instanceof Error && error.message.includes("JWT_SECRET")) {
      console.error("Signup failed: authentication configuration error");

      res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
      return;
    }

    console.error("Signup failed: unexpected server error");

    res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid login data",
        errors: error.issues,
      });
      return;
    }

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (error instanceof Error && error.message.includes("JWT_SECRET")) {
      console.error("Login failed: authentication configuration error");

      res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
      return;
    }

    console.error("Login failed: unexpected server error");

    res.status(500).json({
      success: false,
      message: "Unable to log in",
    });
  }
}

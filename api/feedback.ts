import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { feedbackDataV1Schema, createFeedbackSubmission } from '../types/feedback.js';

const prisma = new PrismaClient();

/**
 * POST /api/feedback
 * Submit user feedback
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validationResult = feedbackDataV1Schema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid feedback data',
        details: validationResult.error.issues,
      });
    }

    const feedbackData = validationResult.data;

    // Create submission payload with denormalized fields
    const submission = createFeedbackSubmission(feedbackData);

    // Insert into database
    const result = await prisma.feedback.create({
      data: {
        schemaVersion: submission.data.schemaVersion,
        data: submission.data as any, // Prisma Json type
        model: submission.model,
        scenarioType: submission.scenarioType,
        rolePlayed: submission.rolePlayed,
        gameCompleted: submission.gameCompleted,
        avgRating: submission.avgRating,
      },
    });

    return res.status(201).json({
      success: true,
      id: result.id,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);

    return res.status(500).json({
      error: 'Failed to submit feedback',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

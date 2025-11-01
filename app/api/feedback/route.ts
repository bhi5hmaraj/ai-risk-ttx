import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/lib/prisma';
import { feedbackDataV1Schema, createFeedbackSubmission } from '@/types/feedback';

/**
 * POST /api/feedback
 * Submit user feedback
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();

    // Validate request body
    const validationResult = feedbackDataV1Schema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid feedback data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
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

    return NextResponse.json(
      {
        success: true,
        id: result.id,
        message: 'Feedback submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting feedback:', error);

    return NextResponse.json(
      {
        error: 'Failed to submit feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { clerkClient } from '@clerk/nextjs/server';

/**
 * Get the list of allowed admin emails from environment variable
 */
function getAllowedAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS || '';
  return adminEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

/**
 * Check if a user ID corresponds to an admin user
 * @param userId - Clerk user ID
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    const allowedEmails = getAllowedAdminEmails();

    // If no admin emails configured, deny access
    if (allowedEmails.length === 0) {
      console.warn('[adminAccess] No ADMIN_EMAILS configured - denying access');
      return false;
    }

    // Get user from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Get primary email
    const primaryEmail = user.emailAddresses.find(
      email => email.id === user.primaryEmailAddressId
    );

    if (!primaryEmail) {
      console.warn('[adminAccess] User has no primary email:', userId);
      return false;
    }

    const userEmail = primaryEmail.emailAddress.toLowerCase();
    const isAdmin = allowedEmails.includes(userEmail);

    if (!isAdmin) {
      console.warn('[adminAccess] Access denied for email:', userEmail);
    }

    return isAdmin;
  } catch (error) {
    console.error('[adminAccess] Error checking admin access:', error);
    return false;
  }
}

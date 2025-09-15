// API endpoint for fetching user profile
import type { APIRoute } from 'astro';
import type { AppleIDProfile } from '@/types/auth.types';

// Mock profile data - in production this would query your database
const mockProfiles: Record<string, AppleIDProfile> = {
  'volpestyle@gmail.com': {
    id: '1',
    email: 'volpestyle@gmail.com',
    firstName: 'James',
    lastName: 'Volpe',
    displayName: 'James Volpe',
    isWhitelisted: true,
    enrolledBiometrics: [],
    twoFactorEnabled: true
  }
};

export const GET: APIRoute = async ({ params }) => {
  const appleId = params.id;

  if (!appleId) {
    return new Response(JSON.stringify({ error: 'Apple ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const profile = mockProfiles[appleId.toLowerCase()];

  if (!profile) {
    // Create a default profile for whitelisted users
    const defaultProfile: AppleIDProfile = {
      id: Date.now().toString(),
      email: appleId,
      firstName: appleId.split('@')[0] || 'User',
      lastName: '',
      displayName: appleId.split('@')[0] || 'User',
      isWhitelisted: true,
      enrolledBiometrics: [],
      twoFactorEnabled: true
    };

    return new Response(JSON.stringify(defaultProfile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
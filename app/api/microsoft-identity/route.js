import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  return NextResponse.json({
    associatedApplications: [
      { applicationId: '7d8306a2-0f8a-478a-9181-f688e8fc2892' }
    ]
  });
}

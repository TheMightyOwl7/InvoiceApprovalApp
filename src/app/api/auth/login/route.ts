import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('ADMIN_PASSWORD is not set in environment variables');
            return NextResponse.json(
                { success: false, error: 'Server configuration error' },
                { status: 500 }
            );
        }

        if (password === adminPassword) {
            // Set the cookie
            const cookieStore = await cookies();

            // Set a simple auth cookie
            // In a real production app, this should be a signed JWT
            // For this simple gate, existence of the cookie is the proof
            cookieStore.set('admin_session', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                // Expire in 7 days
                maxAge: 60 * 60 * 24 * 7,
            });

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json(
                { success: false, error: 'Incorrect password' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

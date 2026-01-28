import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Check if user has the admin session cookie
    const hasSession = request.cookies.has('admin_session');

    // 2. Define paths that are always accessible (public)
    const isLoginPage = request.nextUrl.pathname === '/login';
    const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth');
    const isStaticAsset =
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.includes('.'); // images, favicon, etc.

    // 3. Logic

    // If user is already logged in and tries to go to login page, redirect to home
    if (hasSession && isLoginPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // If user is NOT logged in and tries to access a protected page
    if (!hasSession && !isLoginPage && !isAuthApi && !isStaticAsset) {
        // For API routes, return 401 JSON instead of redirecting
        // This prevents "Unexpected token <" errors in frontend fetch calls
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // For pages, redirect to login
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (except api/auth) - Wait, we want to protect API too? Yes generally.
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

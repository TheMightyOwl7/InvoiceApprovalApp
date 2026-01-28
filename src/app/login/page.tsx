'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                router.push('/');
                router.refresh(); // Refresh to update middleware state
            } else {
                setError(data.error || 'Invalid password');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-secondary)',
            fontFamily: 'var(--font-sans)',
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: 'var(--spacing-xl)' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
                        Payment Approval
                    </h1>
                    <p className="text-muted">Private Access</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Admin Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            autoFocus
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: 'var(--color-danger)',
                            fontSize: '0.875rem',
                            marginTop: 'var(--spacing-sm)',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
                        disabled={loading}
                    >
                        {loading ? 'Verifying...' : 'Enter System'}
                    </button>
                </form>
            </div>
        </div>
    );
}

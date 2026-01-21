'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, setCurrentUser, CurrentUserContext } from '@/lib/storage';

interface User {
    id: string;
    name: string;
    department: string;
}

export default function Sidebar() {
    const pathname = usePathname();
    const [currentUser, setCurrentUserState] = useState<CurrentUserContext | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    useEffect(() => {
        // Load current user from localStorage
        const user = getCurrentUser();
        setCurrentUserState(user);

        // Fetch all users for the dropdown
        fetchUsers();

        // Fetch pending count for current user
        if (user) {
            fetchPendingCount(user.userId);
        }
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);

                // If no current user set and users exist, set the first one
                const storedUser = getCurrentUser();
                if (!storedUser && data.data.length > 0) {
                    const firstUser = data.data[0];
                    const userContext: CurrentUserContext = {
                        userId: firstUser.id,
                        userName: firstUser.name,
                    };
                    setCurrentUser(userContext);
                    setCurrentUserState(userContext);
                    fetchPendingCount(firstUser.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    }

    async function fetchPendingCount(userId: string) {
        try {
            const res = await fetch(`/api/requests?approverId=${userId}&status=pending`);
            const data = await res.json();
            if (data.success) {
                setPendingCount(data.data.length);
            }
        } catch (error) {
            console.error('Failed to fetch pending count:', error);
        }
    }

    function handleUserSwitch(user: User) {
        const userContext: CurrentUserContext = {
            userId: user.id,
            userName: user.name,
        };
        setCurrentUser(userContext);
        setCurrentUserState(userContext);
        setShowUserDropdown(false);
        fetchPendingCount(user.id);
        // Reload page to refresh data for new user context
        window.location.reload();
    }

    function getInitials(name: string) {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    const navItems = [
        { href: '/', label: 'Dashboard', icon: '📊' },
        { href: '/requests', label: 'All Requests', icon: '📋' },
        { href: '/requests/new', label: 'New Request', icon: '➕' },
        { href: '/requests?filter=pending', label: 'Pending Approval', icon: '⏳', badge: pendingCount },
        { href: '/users', label: 'Manage Users', icon: '👥' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">💳 PaymentApproval</div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                            <span className="nav-badge">{item.badge}</span>
                        )}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div
                    className="user-switcher"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    style={{ cursor: 'pointer', position: 'relative' }}
                >
                    <div className="user-avatar">
                        {currentUser ? getInitials(currentUser.userName) : '?'}
                    </div>
                    <div className="user-info">
                        <div className="user-name">
                            {currentUser?.userName || 'Select User'}
                        </div>
                        <div className="user-role">Click to switch</div>
                    </div>
                </div>

                {showUserDropdown && (
                    <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 'var(--spacing-md)',
                        right: 'var(--spacing-md)',
                        background: 'var(--background)',
                        border: '1px solid var(--color-neutral-200)',
                        borderRadius: 'var(--radius)',
                        boxShadow: 'var(--shadow-lg)',
                        marginBottom: 'var(--spacing-sm)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 200,
                    }}>
                        {users.length === 0 ? (
                            <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-neutral-500)' }}>
                                No users yet. <Link href="/users" style={{ color: 'var(--color-primary)' }}>Create one</Link>
                            </div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => handleUserSwitch(user)}
                                    style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--color-neutral-100)',
                                        background: currentUser?.userId === user.id ? 'var(--color-primary-light)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (currentUser?.userId !== user.id) {
                                            e.currentTarget.style.background = 'var(--color-neutral-100)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (currentUser?.userId !== user.id) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div style={{ fontWeight: 500 }}>{user.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
                                        {user.department}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}

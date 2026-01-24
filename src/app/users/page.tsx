'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser, type CurrentUserContext } from '@/lib/storage';

interface User {
    id: string;
    name: string;
    email: string;
    department: string;
    createdAt: string;
}

interface FormData {
    name: string;
    email: string;
    department: string;
}

const initialFormData: FormData = {
    name: '',
    email: '',
    department: '',
};

function UserNode({
    user,
    isExec = false,
    isActive = false,
    onEdit,
    onDelete,
    onSelect,
    getInitials
}: {
    user: User;
    isExec?: boolean;
    isActive?: boolean;
    onEdit: (u: User) => void;
    onDelete: (u: User) => void;
    onSelect: (u: User) => void;
    getInitials: (n: string) => string;
}) {
    return (
        <div className={`user-node ${isExec ? 'exec' : ''} ${isActive ? 'active' : ''}`}>
            {isActive && <div className="current-badge">Current</div>}
            <div className="user-node-avatar">
                {getInitials(user.name)}
            </div>
            <div className="user-node-info">
                <div className="user-node-name">{user.name}</div>
                <div className="user-node-email">{user.email}</div>
            </div>
            <div className="user-node-actions">
                <button
                    className="btn btn-sm btn-icon btn-success"
                    onClick={() => onSelect(user)}
                    title="Select as demo user"
                    style={{ background: 'var(--color-success)', color: 'white' }}
                >
                    🔑
                </button>
                <button
                    className="btn btn-sm btn-icon btn-secondary"
                    onClick={() => onEdit(user)}
                    title="Edit"
                >
                    ✏️
                </button>
                <button
                    className="btn btn-sm btn-icon btn-danger"
                    onClick={() => onDelete(user)}
                    title="Delete"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    const [activeUserId, setActiveUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
        const current = getCurrentUser();
        if (current) setActiveUserId(current.userId);
    }, []);

    async function fetchUsers() {
        try {
            setLoading(true);
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
            } else {
                setError(data.error || 'Failed to load users');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }

    function openAddModal() {
        setEditingUser(null);
        setFormData(initialFormData);
        setShowModal(true);
    }

    function openEditModal(user: User) {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            department: user.department,
        });
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingUser(null);
        setFormData(initialFormData);
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (data.success) {
                closeModal();
                fetchUsers();
            } else {
                setError(data.error || 'Failed to save user');
            }
        } catch {
            setError('Failed to save user');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(user: User) {
        if (!confirm(`Are you sure you want to delete ${user.name}?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (data.success) {
                fetchUsers();
            } else {
                alert(data.error || 'Failed to delete user');
            }
        } catch {
            alert('Failed to delete user');
        }
    }

    function handleSelectUser(user: User) {
        const userContext: CurrentUserContext = {
            userId: user.id,
            userName: user.name,
        };
        setCurrentUser(userContext);
        setActiveUserId(user.id);
        // Refresh to update entire app context
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

    function getSeniorityRank(name: string): number {
        if (name.includes('(Exec)')) return 0;
        if (name.toLowerCase().includes('exec')) return 0;
        if (name.includes('(Sr. Manager)')) return 1;
        if (name.toLowerCase().includes('senior manager')) return 1;
        if (name.includes('(Manager)')) return 2;
        if (name.toLowerCase().includes('manager')) return 2;
        if (name.includes('(Senior)')) return 3;
        if (name.toLowerCase().includes('senior')) return 3;
        return 4; // Junior or default
    }

    // Grouping logic
    const departments = Array.from(new Set(users.map(u => u.department))).sort();

    const usersByDepartment = departments.reduce((acc, dept) => {
        const deptUsers = users.filter(u => u.department === dept);

        // Sort within department: Exec > Senior > Junior
        deptUsers.sort((a, b) => {
            const rankA = getSeniorityRank(a.name);
            const rankB = getSeniorityRank(b.name);
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
        });

        acc[dept] = deptUsers;
        return acc;
    }, {} as Record<string, User[]>);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Manage Users</h1>
                <button className="btn btn-primary" onClick={openAddModal}>
                    ➕ Add User
                </button>
            </div>

            {loading ? (
                <div className="empty-state">
                    <p>Loading users...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="card">
                    <div className="card-body">
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <div className="empty-state-title">No users yet</div>
                            <p>Add your first user to get started with payment approvals.</p>
                            <button className="btn btn-primary mt-md" onClick={openAddModal}>
                                ➕ Add First User
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="department-grid">
                    {departments.map(dept => (
                        <div key={dept} className="dept-card">
                            <div className="dept-header">
                                <span className="dept-title">{dept}</span>
                                <span className="dept-count">{usersByDepartment[dept].length} users</span>
                            </div>
                            <div className="dept-body">
                                {/* Executives */}
                                {usersByDepartment[dept].some(u => getSeniorityRank(u.name) === 0) && (
                                    <div className="hierarchy-section">
                                        <div className="hierarchy-label">Leadership</div>
                                        {usersByDepartment[dept]
                                            .filter(u => getSeniorityRank(u.name) === 0)
                                            .map(user => (
                                                <UserNode
                                                    key={user.id}
                                                    user={user}
                                                    isExec
                                                    isActive={user.id === activeUserId}
                                                    onEdit={openEditModal}
                                                    onDelete={handleDelete}
                                                    onSelect={handleSelectUser}
                                                    getInitials={getInitials}
                                                />
                                            ))}
                                    </div>
                                )}

                                {/* Senior Managers */}
                                {usersByDepartment[dept].some(u => getSeniorityRank(u.name) === 1) && (
                                    <div className="hierarchy-section">
                                        <div className="hierarchy-label">Senior Management</div>
                                        {usersByDepartment[dept]
                                            .filter(u => getSeniorityRank(u.name) === 1)
                                            .map(user => (
                                                <UserNode
                                                    key={user.id}
                                                    user={user}
                                                    isActive={user.id === activeUserId}
                                                    onEdit={openEditModal}
                                                    onDelete={handleDelete}
                                                    onSelect={handleSelectUser}
                                                    getInitials={getInitials}
                                                />
                                            ))}
                                    </div>
                                )}

                                {/* Managers */}
                                {usersByDepartment[dept].some(u => getSeniorityRank(u.name) === 2) && (
                                    <div className="hierarchy-section">
                                        <div className="hierarchy-label">Management</div>
                                        {usersByDepartment[dept]
                                            .filter(u => getSeniorityRank(u.name) === 2)
                                            .map(user => (
                                                <UserNode
                                                    key={user.id}
                                                    user={user}
                                                    isActive={user.id === activeUserId}
                                                    onEdit={openEditModal}
                                                    onDelete={handleDelete}
                                                    onSelect={handleSelectUser}
                                                    getInitials={getInitials}
                                                />
                                            ))}
                                    </div>
                                )}

                                {/* Seniors */}
                                {usersByDepartment[dept].some(u => getSeniorityRank(u.name) === 3) && (
                                    <div className="hierarchy-section">
                                        <div className="hierarchy-label">Senior Staff</div>
                                        {usersByDepartment[dept]
                                            .filter(u => getSeniorityRank(u.name) === 3)
                                            .map(user => (
                                                <UserNode
                                                    key={user.id}
                                                    user={user}
                                                    isActive={user.id === activeUserId}
                                                    onEdit={openEditModal}
                                                    onDelete={handleDelete}
                                                    onSelect={handleSelectUser}
                                                    getInitials={getInitials}
                                                />
                                            ))}
                                    </div>
                                )}

                                {/* Juniors / Others */}
                                {usersByDepartment[dept].some(u => getSeniorityRank(u.name) === 4) && (
                                    <div className="hierarchy-section">
                                        <div className="hierarchy-label">Team Members</div>
                                        {usersByDepartment[dept]
                                            .filter(u => getSeniorityRank(u.name) === 4)
                                            .map(user => (
                                                <UserNode
                                                    key={user.id}
                                                    user={user}
                                                    isActive={user.id === activeUserId}
                                                    onEdit={openEditModal}
                                                    onDelete={handleDelete}
                                                    onSelect={handleSelectUser}
                                                    getInitials={getInitials}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {error && (
                                    <div className="form-error mb-md" style={{ padding: 'var(--spacing-sm)', background: 'var(--color-danger-light)', borderRadius: 'var(--radius)' }}>
                                        {error}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Smith"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@company.com"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Department *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="Finance"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

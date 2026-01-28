'use client';

import { useState, useEffect } from 'react';

interface JobRole {
    id: string;
    name: string;
    level: number;
}

interface Department {
    id: string;
    name: string;
    _count?: {
        users: number;
        jobRoles: number;
    };
}

export default function DepartmentManager({
    isOpen,
    onClose,
    onChange
}: {
    isOpen: boolean;
    onClose: () => void;
    onChange: () => void; // Trigger refresh in parent
}) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
    const [roles, setRoles] = useState<JobRole[]>([]);

    // Form states
    const [newDeptName, setNewDeptName] = useState('');
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleLevel, setNewRoleLevel] = useState(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) fetchDepartments();
    }, [isOpen]);

    useEffect(() => {
        if (selectedDeptId) fetchRoles(selectedDeptId);
        else setRoles([]);
    }, [selectedDeptId]);

    async function fetchDepartments() {
        setLoading(true);
        try {
            const res = await fetch('/api/departments');
            const data = await res.json();
            if (data.success) setDepartments(data.data);
        } catch (e) {
            setError('Failed to load departments');
        } finally {
            setLoading(false);
        }
    }

    async function fetchRoles(deptId: string) {
        try {
            const res = await fetch(`/api/departments/${deptId}/roles`);
            const data = await res.json();
            if (data.success) setRoles(data.data);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAddDepartment(e: React.FormEvent) {
        e.preventDefault();
        try {
            const res = await fetch('/api/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDeptName })
            });
            const data = await res.json();
            if (data.success) {
                setNewDeptName('');
                fetchDepartments();
                onChange(); // Notify parent
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError('Failed to create department');
        }
    }

    async function handleAddRole(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedDeptId) return;

        try {
            const res = await fetch(`/api/departments/${selectedDeptId}/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName, level: Number(newRoleLevel) })
            });
            const data = await res.json();
            if (data.success) {
                setNewRoleName('');
                fetchRoles(selectedDeptId);
            } else {
                setError(data.error);
            }
        } catch (e) {
            setError('Failed to create role');
        }
    }

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Manage Departments & Roles</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Left Col: Departments */}
                    <div className="panel">
                        <h3 className="text-lg font-bold mb-sm">Departments</h3>

                        <form onSubmit={handleAddDepartment} className="flex gap-2 mb-md">
                            <input
                                className="form-input"
                                placeholder="New Department..."
                                value={newDeptName}
                                onChange={e => setNewDeptName(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn btn-primary">+</button>
                        </form>

                        <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {departments.map(dept => (
                                <div
                                    key={dept.id}
                                    className={`list-item p-sm cursor-pointer ${selectedDeptId === dept.id ? 'bg-primary-light' : ''}`}
                                    onClick={() => setSelectedDeptId(dept.id)}
                                    style={{
                                        padding: '8px',
                                        borderBottom: '1px solid #eee',
                                        background: selectedDeptId === dept.id ? '#eef2ff' : 'transparent',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div className="font-medium">{dept.name}</div>
                                    <div className="text-sm text-gray">{dept._count?.users || 0} users</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Col: Roles */}
                    <div className="panel" style={{ borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
                        <h3 className="text-lg font-bold mb-sm">
                            {selectedDeptId ? 'Job Roles' : 'Select a Department'}
                        </h3>

                        {selectedDeptId ? (
                            <>
                                <form onSubmit={handleAddRole} className="mb-md">
                                    <div className="form-group mb-sm">
                                        <input
                                            className="form-input"
                                            placeholder="Role Name (e.g. Manager)"
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            className="form-input"
                                            value={newRoleLevel}
                                            onChange={e => setNewRoleLevel(Number(e.target.value))}
                                            style={{ width: '80px' }}
                                        >
                                            <option value={1}>Lvl 1</option>
                                            <option value={2}>Lvl 2</option>
                                            <option value={3}>Lvl 3</option>
                                            <option value={4}>Lvl 4</option>
                                            <option value={5}>Lvl 5</option>
                                            <option value={10}>Lvl 10</option>
                                        </select>
                                        <button type="submit" className="btn btn-secondary flex-1">Add Role</button>
                                    </div>
                                </form>

                                <div className="list-group">
                                    {roles.map(role => (
                                        <div key={role.id} className="p-sm border-b flex justify-between">
                                            <span>{role.name}</span>
                                            <span className="badge badge-sm">Lvl {role.level}</span>
                                        </div>
                                    ))}
                                    {roles.length === 0 && <div className="text-gray text-sm">No roles defined.</div>}
                                </div>
                            </>
                        ) : (
                            <div className="text-gray italic">Select a department on the left to manage its roles.</div>
                        )}
                    </div>
                </div>

                {error && <div className="p-md text-danger">{error}</div>}
            </div>
        </div>
    );
}

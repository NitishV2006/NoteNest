

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import { User, Note, UserRole, Department } from '../types';
import { DeleteIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { DepartmentManagement } from './DepartmentManagement';

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleStyles: { [key in UserRole]: string } = {
        [UserRole.ADMIN]: 'bg-red-100 text-red-800',
        [UserRole.FACULTY]: 'bg-blue-100 text-blue-800',
        [UserRole.STUDENT]: 'bg-green-100 text-green-800',
    };

    const style = roleStyles[role] || 'bg-gray-100 text-gray-800';
    
    return (
        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${style}`}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
    );
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user: currentUser } = useAuth();
    
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedUsers = await api.getUsers();
            setUsers(fetchedUsers);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError("Could not load users. There might be a server issue or a problem with your permissions.");
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchUsers();

        const channel = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsers)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchUsers]);

    const handleDeleteUser = async (userId: string) => {
        if (currentUser && userId === currentUser.id) {
            alert("For safety, you cannot delete your own account from the dashboard.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this user profile? This action is irreversible.')) {
            await api.deleteUser(userId);
            // Realtime subscription will trigger refetch
        }
    };
    
    if (loading) return <div className="text-center p-4">Loading users...</div>;
    
    if (error) return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">User Management</h3>
            <div className="text-center p-4 text-red-700 bg-red-50 rounded-lg border border-red-200">
                <p className="font-semibold text-lg">Could Not Load Users</p>
                <p className="mt-2 text-left">{error}</p>
            </div>
        </div>
    );


    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">User Management</h3>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name || 'No Name Provided'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.role ? <RoleBadge role={user.role} /> : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.department_name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button 
                                      onClick={() => handleDeleteUser(user.id)} 
                                      className="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                      disabled={currentUser?.id === user.id}
                                      title={currentUser?.id === user.id ? 'You cannot delete your own account.' : `Delete ${user.name}`}
                                    >
                                      <DeleteIcon />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const NoteManagement: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const departmentMap = useMemo(() => 
        departments.reduce((acc, dept) => {
            acc[dept.id] = dept.name;
            return acc;
        }, {} as Record<string, string>), 
    [departments]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedNotes = await api.getAllNotes();
            setNotes(fetchedNotes);

            // Departments are for enrichment. Fetch them separately so that if they fail,
            // the notes still render correctly.
            try {
                const fetchedDepartments = await api.getDepartments();
                setDepartments(fetchedDepartments);
            } catch (deptErr) {
                console.warn("Could not fetch departments for admin dashboard:", deptErr);
                // This is a non-critical failure. The table will show N/A for department names.
            }
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
            setError("Could not load content data. This might be due to a server permission issue.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
        
        const channel = supabase
            .channel('public:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchAllData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [fetchAllData]);

    const handleDeleteNote = async (noteId: string, filePath: string) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await api.deleteNote(noteId, filePath);
                // Realtime subscription will trigger a refetch
            } catch(e) {
                console.error("Error deleting note:", e);
                alert("Could not delete the note.");
            }
        }
    };

    if (loading) return <div className="text-center p-4">Loading notes...</div>;
    if (error) return <div className="text-center p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Content Management</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {notes.map(note => (
                            <tr key={note.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs" title={note.faculty_id}>{note.faculty_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{departmentMap[note.department_id] || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(note.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDeleteNote(note.id, note.file_path)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
        <div className="bg-white p-2 rounded-lg shadow-md inline-block">
            <nav className="flex space-x-1 sm:space-x-2">
                <button onClick={() => setActiveTab('users')} className={`px-3 py-2 rounded-md font-medium text-sm ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Users</button>
                <button onClick={() => setActiveTab('notes')} className={`px-3 py-2 rounded-md font-medium text-sm ${activeTab === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Content</button>
                <button onClick={() => setActiveTab('departments')} className={`px-3 py-2 rounded-md font-medium text-sm ${activeTab === 'departments' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Departments</button>
            </nav>
        </div>

        <div>
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'notes' && <NoteManagement />}
            {activeTab === 'departments' && <DepartmentManagement />}
        </div>
    </div>
  );
}
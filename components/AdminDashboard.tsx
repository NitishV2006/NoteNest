
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import { User, Note, UserRole, Department } from '../types';
import { DeleteIcon, UsersIcon, ClipboardListIcon, BuildingLibraryIcon } from './Icons';
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedNotes = await api.getAllNotes();
            setNotes(fetchedNotes);
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
            setError(err instanceof Error ? err.message : "Could not load content data. This might be due to a server permission issue.");
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

    const handleDeleteNote = async (noteId: string) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await api.deleteNote(noteId);
                // Realtime subscription will trigger a refetch
            } catch(e) {
                console.error("Error deleting note:", e);
                alert(`Could not delete the note: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        }
    };

    if (loading) return <div className="text-center p-4">Loading notes...</div>;
    if (error) return (
        <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg shadow border border-red-200">
            <h3 className="font-bold text-lg">Could Not Load Content</h3>
            <p className="mt-2 whitespace-pre-wrap text-left">{error}</p>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Content Management</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faculty</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {notes.map(note => (
                            <tr key={note.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" title={note.faculty_id}>
                                    {note.faculty_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.department_name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(note.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDeleteNote(note.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClasses: string }> = ({ title, value, icon, colorClasses }) => (
    <div className="bg-white p-5 rounded-xl shadow-md flex items-center space-x-4 transition-transform transform hover:-translate-y-1">
        <div className={`p-3 rounded-full ${colorClasses}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState({ users: 0, notes: 0, departments: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  
  const fetchStats = useCallback(async () => {
    try {
        const [usersCount, notesCount, departmentsCount] = await Promise.all([
            api.getUsersCount(),
            api.getNotesCount(),
            api.getDepartmentsCount()
        ]);
        setStats({ users: usersCount, notes: notesCount, departments: departmentsCount });
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
    } finally {
        setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    const usersChannel = supabase.channel('public:profiles:stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats).subscribe();
    const notesChannel = supabase.channel('public:notes:stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchStats).subscribe();
    const departmentsChannel = supabase.channel('public:departments:stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, fetchStats).subscribe();
        
    return () => {
        supabase.removeChannel(usersChannel);
        supabase.removeChannel(notesChannel);
        supabase.removeChannel(departmentsChannel);
    };
  }, [fetchStats]);

  const getStatValue = (value: number) => statsLoading ? '...' : value;

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Users" 
                    value={getStatValue(stats.users)} 
                    icon={<UsersIcon className="h-7 w-7 text-blue-800"/>}
                    colorClasses="bg-blue-100"
                />
                <StatCard 
                    title="Total Notes" 
                    value={getStatValue(stats.notes)} 
                    icon={<ClipboardListIcon className="h-7 w-7 text-green-800"/>}
                    colorClasses="bg-green-100"
                />
                <StatCard 
                    title="Total Departments" 
                    value={getStatValue(stats.departments)} 
                    icon={<BuildingLibraryIcon className="h-7 w-7 text-purple-800"/>}
                    colorClasses="bg-purple-100"
                />
            </div>
        </div>

        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                            ${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <UsersIcon className="mr-2 h-5 w-5" /> Users
                    </button>
                     <button 
                        onClick={() => setActiveTab('notes')} 
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                            ${activeTab === 'notes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <ClipboardListIcon className="mr-2 h-5 w-5" /> Content
                    </button>
                     <button 
                        onClick={() => setActiveTab('departments')} 
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center
                            ${activeTab === 'departments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <BuildingLibraryIcon className="mr-2 h-5 w-5" /> Departments
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'notes' && <NoteManagement />}
                {activeTab === 'departments' && <DepartmentManagement />}
            </div>
        </div>
    </div>
  );
}
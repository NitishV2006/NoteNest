import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { Department } from '../types';
import { DeleteIcon, EditIcon, CheckIcon, XIcon } from './Icons';
import { supabase } from '../services/supabase';

export const DepartmentManagement: React.FC = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
    const [editingDepartmentName, setEditingDepartmentName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);


    const fetchDepartments = useCallback(async () => {
        // No need to set loading true here as it's for initial load.
        // Realtime updates should be seamless.
        try {
            const data = await api.getDepartments();
            setDepartments(data);
        } catch (err) {
            console.error(err);
            setError('Could not fetch departments.');
        } finally {
            if(loading) setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        fetchDepartments();

        const channel = supabase
            .channel('public:departments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, fetchDepartments)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDepartments]);

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await api.addDepartment(newDepartmentName.trim());
            setNewDepartmentName('');
            // Realtime subscription will handle the UI update
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            if (errorMessage.includes('duplicate key value violates unique constraint')) {
                setError(`Department "${newDepartmentName.trim()}" already exists.`);
            } else {
                setError('Failed to add department. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this department? This might affect users and notes associated with it.')) {
            try {
                await api.deleteDepartment(id);
                // Realtime subscription will handle the UI update
            } catch (err) {
                console.error(err);
                setError('Failed to delete department.');
            }
        }
    };

    const handleStartEdit = (department: Department) => {
        setError(null);
        setEditingDepartmentId(department.id);
        setEditingDepartmentName(department.name);
    };

    const handleCancelEdit = () => {
        setEditingDepartmentId(null);
        setEditingDepartmentName('');
    };

    const handleUpdateDepartment = async (id: string) => {
        if (!editingDepartmentName.trim()) {
            setError("Department name cannot be empty.");
            return;
        }
        
        setIsUpdating(true);
        setError(null);
        try {
            await api.updateDepartment(id, editingDepartmentName.trim());
            handleCancelEdit();
            // Realtime will update the list
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            if (errorMessage.includes('duplicate key value violates unique constraint')) {
                setError(`Department "${editingDepartmentName.trim()}" already exists.`);
            } else {
                setError('Failed to update department. Please try again.');
            }
        } finally {
            setIsUpdating(false);
        }
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Add Department</h3>
                    <form onSubmit={handleAddDepartment} className="space-y-4">
                        <div>
                            <label htmlFor="dept-name" className="block text-sm font-medium text-gray-700">Department Name</label>
                            <input
                                id="dept-name"
                                type="text"
                                value={newDepartmentName}
                                onChange={(e) => setNewDepartmentName(e.target.value)}
                                placeholder="e.g., Computer Science"
                                required
                                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2 px-4 text-white bg-blue-600 rounded-md font-semibold hover:bg-blue-700 disabled:bg-blue-300"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Department'}
                        </button>
                    </form>
                    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                </div>
            </div>
            <div className="md:col-span-2">
                 <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Existing Departments</h3>
                    {loading ? (
                        <p>Loading departments...</p>
                    ) : (
                         <div className="overflow-x-auto">
                             <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {departments.length > 0 ? departments.map(dept => (
                                        <tr key={dept.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {editingDepartmentId === dept.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingDepartmentName}
                                                        onChange={(e) => setEditingDepartmentName(e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateDepartment(dept.id)}
                                                    />
                                                ) : (
                                                    dept.name
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {editingDepartmentId === dept.id ? (
                                                    <div className="flex items-center justify-end space-x-4">
                                                        <button onClick={() => handleUpdateDepartment(dept.id)} disabled={isUpdating} className="text-green-600 hover:text-green-900 disabled:text-gray-400">
                                                            <CheckIcon />
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900">
                                                            <XIcon />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end space-x-4">
                                                        <button onClick={() => handleStartEdit(dept)} className="text-blue-600 hover:text-blue-900">
                                                            <EditIcon />
                                                        </button>
                                                        <button onClick={() => handleDeleteDepartment(dept.id)} className="text-red-600 hover:text-red-900">
                                                            <DeleteIcon />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={2} className="px-6 py-4 text-center text-gray-500">No departments found.</td>
                                        </tr>
                                    )}
                                </tbody>
                             </table>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};
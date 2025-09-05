
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { Note } from '../types';
import { UploadIcon, DeleteIcon, EditIcon, CheckIcon, XIcon } from './Icons';
import Profile from './Profile';
import { supabase } from '../services/supabase';

const UploadNoteForm: React.FC<{onUploadSuccess: () => void}> = ({ onUploadSuccess }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();
    
    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user || !user.department_id) {
            setMessage('User profile is incomplete. Please set your department before uploading.');
            return;
        };
        setIsUploading(true);
        setMessage('');

        try {
            await api.uploadNote(title, file, user.id, user.department_id);
            setMessage('Note uploaded successfully!');
            setTitle('');
            setFile(null);
            const fileInput = document.getElementById('noteFile') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
            onUploadSuccess();
        } catch (err) {
            setMessage('Failed to upload note.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Upload a New Note</h3>
            <form onSubmit={handleUpload} className="space-y-4">
                <div>
                    <label htmlFor="noteTitle" className="block text-sm font-medium text-gray-700">Note Title</label>
                    <input id="noteTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md" />
                </div>
                 <div>
                    <label htmlFor="noteFile" className="block text-sm font-medium text-gray-700">File (PDF, TXT, etc.)</label>
                    <input id="noteFile" type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
                <button type="submit" disabled={isUploading} className="w-full flex items-center justify-center px-4 py-2 font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
                    <UploadIcon className="w-5 h-5 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Note'}
                </button>
            </form>
            {message && <p className={`mt-4 text-sm text-center ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        </div>
    )
}

const MyNotes: React.FC = () => {
    const { user } = useAuth();
    const [myNotes, setMyNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchNotes = useCallback(async () => {
        if (user) {
            setLoading(true);
            setError(null);
            try {
                const notes = await api.getNotesByFaculty(user.id);
                setMyNotes(notes);
            } catch (err) {
                console.error("Failed to fetch faculty notes:", err);
                setError(err instanceof Error ? err.message : "Could not load your notes. Please contact an administrator.");
            } finally {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotes();

        const channel = supabase
            .channel('public:notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
                // To avoid conflicts with in-line editing, only refetch if not currently editing.
                if (!editingNoteId) {
                    fetchNotes();
                }
            })
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        }
    }, [fetchNotes, editingNoteId]);

    const handleDelete = async (noteId: string) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await api.deleteNote(noteId);
                // Optimistically update UI, then let realtime sync correct if needed.
                setMyNotes(prev => prev.filter(note => note.id !== noteId));
            } catch (error) {
                console.error("Failed to delete note", error);
                alert(`Could not delete the note: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    
    const handleStartEdit = (note: Note) => {
        setEditingNoteId(note.id);
        setEditingTitle(note.title);
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setEditingTitle('');
    };

    const handleSaveEdit = async () => {
        if (!editingNoteId || !editingTitle.trim()) return;
        
        const originalNotes = [...myNotes];
        const noteToUpdate = myNotes.find(n => n.id === editingNoteId);
        if (!noteToUpdate) return;
        
        // Optimistically update the UI for a responsive feel.
        const updatedNote = { ...noteToUpdate, title: editingTitle.trim() };
        setMyNotes(myNotes.map(n => n.id === editingNoteId ? updatedNote : n));
        handleCancelEdit();

        setIsUpdating(true);
        try {
            await api.updateNote(editingNoteId, editingTitle.trim());
            // The API call succeeded, no need to do anything as UI is already updated.
        } catch (err) {
            console.error("Failed to update note", err);
            alert("Could not update the note. Reverting changes.");
            // If the API call fails, revert the optimistic UI update.
            setMyNotes(originalNotes);
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading) return <div className="text-center p-8">Loading your notes...</div>;
    
    if (error) return (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-red-600 bg-red-50 border border-red-200">
            <h3 className="font-bold text-lg">Could Not Load Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-left">{error}</p>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
             <h3 className="text-xl font-bold text-gray-800 mb-4">My Uploaded Notes</h3>
             <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Upload Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {myNotes.length > 0 ? myNotes.map(note => (
                            <tr key={note.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                     {editingNoteId === note.id ? (
                                        <input 
                                            type="text"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                        />
                                    ) : (
                                        note.title
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(note.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {editingNoteId === note.id ? (
                                        <div className="flex items-center justify-end space-x-4">
                                            <button onClick={handleSaveEdit} disabled={isUpdating} className="text-green-600 hover:text-green-900 disabled:text-gray-400">
                                                <CheckIcon />
                                            </button>
                                            <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900">
                                                <XIcon />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end space-x-4">
                                            <button onClick={() => handleStartEdit(note)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                                            <button onClick={() => handleDelete(note.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">You haven't uploaded any notes yet.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
             </div>
        </div>
    )
}

export default function FacultyDashboard() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
        <div className="bg-white p-2 rounded-lg shadow-md inline-block">
            <nav className="flex space-x-2">
                <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-md font-medium text-sm ${activeTab === 'profile' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>My Profile</button>
                <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-md font-medium text-sm ${activeTab === 'upload' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Upload Note</button>
                <button onClick={() => setActiveTab('notes')} className={`px-4 py-2 rounded-md font-medium text-sm ${activeTab === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>My Notes</button>
            </nav>
        </div>

        <div>
            {activeTab === 'profile' && <Profile />}
            {activeTab === 'upload' && <UploadNoteForm onUploadSuccess={() => setActiveTab('notes')} />}
            {activeTab === 'notes' && <MyNotes />}
        </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { Note } from '../types';
import { UploadIcon, DeleteIcon, EditIcon } from './Icons';
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

    const fetchNotes = useCallback(async () => {
        if (user) {
            setLoading(true);
            setError(null);
            try {
                const notes = await api.getNotesByFaculty(user.id);
                setMyNotes(notes);
            } catch (err) {
                console.error("Failed to fetch faculty notes:", err);
                setError("Could not load your notes due to a server permission issue. Please contact an administrator.");
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
                fetchNotes();
            })
            .subscribe();
        
        return () => {
            supabase.removeChannel(channel);
        }
    }, [fetchNotes]);

    const handleDelete = async (noteId: string, filePath: string) => {
        if (window.confirm('Are you sure you want to delete this note?')) {
            try {
                await api.deleteNote(noteId, filePath);
                // The realtime subscription will trigger a refetch.
            } catch (error) {
                console.error("Failed to delete note", error);
                alert("Could not delete the note.");
            }
        }
    }
    
    if (loading) return <div className="text-center p-8">Loading your notes...</div>;
    
    if (error) return (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-red-600 bg-red-50 border border-red-200">
            <h3 className="font-bold text-lg">Could Not Load Notes</h3>
            <p className="mt-2">{error}</p>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.title}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(note.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button className="text-blue-600 hover:text-blue-900 mr-4" disabled title="Edit not available yet"><EditIcon /></button>
                                    <button onClick={() => handleDelete(note.id, note.file_path)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
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
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Note, Department } from '../types';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { DownloadIcon } from './Icons';
import { supabase } from '../services/supabase';

const NoteCard: React.FC<{note: Note}> = ({ note }) => {
    const handleDownload = async () => {
        try {
            const { data, error } = await supabase.storage.from('notes').download(note.file_path);
            if (error) throw error;
            
            const url = window.URL.createObjectURL(data);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = note.file_path.split('/').pop() || `${note.title.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Could not download the file.');
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between hover:shadow-lg transition-shadow">
            <div>
                <h3 className="text-lg font-semibold text-gray-800">{note.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Faculty: {note.faculty_name || <span className="text-gray-400" title={note.faculty_id}>Name unavailable</span>}</p>
                <p className="text-sm text-gray-500">Department: {note.department_name}</p>
                <p className="text-xs text-gray-400 mt-2">Uploaded: {new Date(note.created_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-4">
                <button 
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    aria-label={`Download note titled ${note.title}`}
                >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Download
                </button>
            </div>
        </div>
    );
};

export default function StudentDashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { user, loading: authLoading } = useAuth();
  
  const fetchNotesAndData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      // api.getAllNotes now returns fully enriched notes.
      const fetchedNotes = await api.getAllNotes();
      setNotes(fetchedNotes);
      
      // We still need all departments for the filter dropdown.
      const fetchedDepartments = await api.getDepartments();
      setDepartments(fetchedDepartments);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notes. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for the authentication process to finish before fetching data.
    // This prevents a race condition where the fetch might happen before the user is fully identified.
    if (authLoading) return;

    fetchNotesAndData();
    const channel = supabase
      .channel('public:notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchNotesAndData)
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [authLoading, fetchNotesAndData]);

  const uniqueFaculties = useMemo(() => {
    const facultyMap = new Map<string, string>();
    notes.forEach(note => {
        if (note.faculty_id && note.faculty_name && !facultyMap.has(note.faculty_id)) {
            facultyMap.set(note.faculty_id, note.faculty_name);
        }
    });
    return Array.from(facultyMap, ([id, name]) => ({ id, name }));
  }, [notes]);
  
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const noteDate = new Date(note.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if(start) start.setHours(0,0,0,0);
      if(end) end.setHours(23,59,59,999);

      return (
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (departmentFilter === '' || note.department_id === departmentFilter) &&
        (facultyFilter === '' || note.faculty_id === facultyFilter) &&
        (!start || noteDate >= start) &&
        (!end || noteDate <= end)
      );
    });
  }, [notes, searchTerm, departmentFilter, facultyFilter, startDate, endDate]);

  if (loading || authLoading) return <div className="text-center p-8">Loading notes...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Search & Filter Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <input type="text" placeholder="Search by note title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
           <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">All Departments</option>
            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
          <select value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">All Faculties</option>
            {uniqueFaculties.map(faculty => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
      </div>

      {error ? (
        <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg shadow border border-red-200">
            <h3 className="font-bold text-lg">Could Not Load Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-left">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredNotes.length > 0 ? (
              filteredNotes.map(note => <NoteCard key={note.id} note={note} />)
          ) : (
              <p className="col-span-full text-center text-gray-500 py-10">No notes found matching your criteria.</p>
          )}
        </div>
      )}
    </div>
  );
}
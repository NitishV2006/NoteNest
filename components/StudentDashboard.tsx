import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Note, QuizQuestion } from '../types';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { DownloadIcon, SparklesIcon, XIcon } from './Icons';
import { supabase } from '../services/supabase';

const QuizModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    note: Note | null;
    onGenerate: (note: Note) => Promise<void>;
    quizData: QuizQuestion[] | null;
    isLoading: boolean;
    error: string | null;
}> = ({ isOpen, onClose, note, onGenerate, quizData, isLoading, error }) => {
    if (!isOpen || !note) return null;

    const QuestionCard: React.FC<{ question: QuizQuestion; index: number }> = ({ question, index }) => {
        const [showAnswer, setShowAnswer] = useState(false);
        const [selectedOption, setSelectedOption] = useState<string | null>(null);

        const handleShowAnswer = () => {
            setShowAnswer(true);
            setSelectedOption(question.answer);
        };
        
        const getOptionStyle = (option: string) => {
            if (!showAnswer) {
                return selectedOption === option ? 'bg-blue-100 border-blue-400' : 'bg-white';
            }
            if (option === question.answer) {
                return 'bg-green-100 border-green-500 text-green-800 font-semibold';
            }
            if (option === selectedOption) {
                return 'bg-red-100 border-red-500 text-red-800';
            }
            return 'bg-white opacity-70';
        };

        return (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-800">{index + 1}. {question.question}</p>
                <div className="mt-3 space-y-2">
                    {question.options.map((option, i) => (
                        <button 
                            key={i} 
                            onClick={() => !showAnswer && setSelectedOption(option)}
                            className={`w-full text-left p-3 border rounded-md transition-all duration-200 ${getOptionStyle(option)}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                 <div className="mt-4 text-right">
                    <button
                        onClick={handleShowAnswer}
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                        Show Answer
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <SparklesIcon className="w-6 h-6 mr-2 text-blue-500"/>
                        Practice Quiz: <span className="font-normal ml-1 truncate">{note.title}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-4">
                    {isLoading && <p className="text-center text-gray-600">Generating your quiz with Gemini...</p>}
                    {error && <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>}
                    {quizData && quizData.map((q, i) => <QuestionCard key={i} question={q} index={i} />)}
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                     <p className="text-xs text-gray-500">AI-generated content may not be 100% accurate.</p>
                     <div>
                        <button onClick={() => onGenerate(note)} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300">
                            {isLoading ? 'Generating...' : 'Regenerate'}
                        </button>
                        <button onClick={onClose} className="ml-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const NoteCard: React.FC<{note: Note; onGenerateQuiz: (note: Note) => void}> = ({ note, onGenerateQuiz }) => {
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
            <div className="mt-4 space-y-2">
                 <button 
                    onClick={() => onGenerateQuiz(note)}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                    aria-label={`Generate practice quiz for ${note.title}`}
                >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Generate Quiz
                </button>
                <button 
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for Quiz Modal
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);


  const { user } = useAuth();
  
  const fetchNotesAndData = useCallback(async () => {
    if (!user || !user.department_id) {
        setError("Please complete your profile by selecting a department to view notes.");
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      setError(null);
      const fetchedNotes = await api.getNotesForStudent(user.department_id);
      const fetchedDepartments = await api.getDepartments().catch(() => []);
      const studentDeptName = fetchedDepartments.find(d => d.id === user.department_id)?.name || 'Unknown Department';
      
      const enrichedNotes = fetchedNotes.map(note => ({ ...note, department_name: studentDeptName }));
      setNotes(enrichedNotes);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      setError('Failed to fetch notes due to a server permission issue. Please contact an administrator.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotesAndData();
    const channel = supabase
      .channel('public:notes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, fetchNotesAndData)
      .subscribe();
    return () => { supabase.removeChannel(channel); }
  }, [fetchNotesAndData]);

  const generateQuiz = useCallback(async (note: Note) => {
      setIsQuizLoading(true);
      setQuizData(null);
      setQuizError(null);
      try {
          const { data, error } = await supabase.storage.from('notes').download(note.file_path);
          if (error) throw error;
          
          if (!data.type.startsWith('text/')) {
              throw new Error("Cannot generate quiz. This feature only supports text-based files (e.g., .txt, .md).");
          }

          const noteText = await data.text();
          if (!noteText.trim()) {
              throw new Error("Cannot generate quiz. The note file is empty.");
          }
          
          const quiz = await api.generateQuizFromText(noteText);
          setQuizData(quiz);
      } catch (err) {
          console.error("Quiz generation failed:", err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setQuizError(`Failed to generate quiz: ${errorMessage}`);
      } finally {
          setIsQuizLoading(false);
      }
  }, []);
  
  const handleOpenQuizModal = (note: Note) => {
    setSelectedNote(note);
    setIsQuizModalOpen(true);
    generateQuiz(note);
  };
  
  const handleCloseQuizModal = () => {
      setIsQuizModalOpen(false);
      setSelectedNote(null);
      setQuizData(null);
      setQuizError(null);
  };

  const uniqueFaculties = useMemo(() => Array.from(new Set(notes.map(note => note.faculty_id))), [notes]);
  
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const noteDate = new Date(note.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if(start) start.setHours(0,0,0,0);
      if(end) end.setHours(23,59,59,999);

      return (
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (facultyFilter === '' || note.faculty_id === facultyFilter) &&
        (!start || noteDate >= start) &&
        (!end || noteDate <= end)
      );
    });
  }, [notes, searchTerm, facultyFilter, startDate, endDate]);

  if (loading) return <div className="text-center p-8">Loading notes...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Search & Filter Notes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="text" placeholder="Search by note title..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          <select value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option value="">All Faculties</option>
            {uniqueFaculties.map(facultyId => <option key={facultyId} value={facultyId}>{facultyId}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
      </div>

      {error ? (
        <div className="text-center p-8 text-red-600 bg-red-50 rounded-lg shadow border border-red-200">
            <h3 className="font-bold text-lg">Could Not Load Notes</h3>
            <p className="mt-2">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredNotes.length > 0 ? (
              filteredNotes.map(note => <NoteCard key={note.id} note={note} onGenerateQuiz={handleOpenQuizModal} />)
          ) : (
              <p className="col-span-full text-center text-gray-500 py-10">No notes found matching your criteria.</p>
          )}
        </div>
      )}
      
      <QuizModal 
        isOpen={isQuizModalOpen}
        onClose={handleCloseQuizModal}
        note={selectedNote}
        onGenerate={generateQuiz}
        quizData={quizData}
        isLoading={isQuizLoading}
        error={quizError}
      />
    </div>
  );
}
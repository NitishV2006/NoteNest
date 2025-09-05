



import { supabase } from './supabase';
import { User, Note, Department, UserRole, QuizQuestion } from '../types';

// --- Auth API ---

export const login = async (email: string, pass: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
};

export const register = async (name: string, email: string, pass: string, role: string) => {
    return supabase.auth.signUp({
        email,
        password: pass,
        options: {
            data: { name, role }
        }
    });
};

export const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

// --- Profile & User API (using relational queries) ---

const PROFILE_COLUMNS = 'id, name, email, role, mobile_number, department_id, subject_taught';

export const getProfile = async (userId: string): Promise<User> => {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            ${PROFILE_COLUMNS},
            departments(name)
        `)
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Supabase error fetching profile:', error);
        throw new Error(`Failed to fetch user profile. DB Error: ${error.message}.`);
    }
    if (!data) throw new Error("User profile not found in the database.");

    // Unpack the department name from the nested object for a flat structure
    const { departments, ...profileData } = data;
    const profile = {
        ...profileData,
        department_name: departments?.name,
    };

    return profile as User;
}

export const updateProfile = async (userId: string, data: Partial<User>): Promise<User> => {
    const profileUpdateData = {
        name: data.name,
        mobile_number: data.mobile_number,
        department_id: data.department_id,
        subject_taught: data.subject_taught
    };

    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', userId)
        .select(`
            ${PROFILE_COLUMNS},
            departments(name)
        `)
        .single();
    
    if (updateError) throw updateError;
    if (!updatedProfile) throw new Error("Update operation failed to return data.");

    const { departments, ...profileData } = updatedProfile;
    return {
        ...profileData,
        department_name: departments?.name
    } as User;
};

export const getUsers = async (): Promise<User[]> => {
    // To fix a potential RLS issue with joins, we fetch users and departments in separate
    // queries and combine them on the client. This is a more resilient pattern.
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, role, department_id');

    if (usersError) throw usersError;
    if (!users) return [];

    // Fetch all departments to map department_id to department_name.
    // We wrap this in a catch block so that the user list can still load
    // even if the departments list fails for some reason.
    const departments = await getDepartments().catch(error => {
        console.warn("Could not fetch departments for admin user list. Department names will be missing.", error);
        return []; // On failure, proceed with an empty list of departments.
    });
    
    // FIX: The Map constructor requires an array of tuples `[key, value]`.
    // We explicitly set the return type of map() to `[string, string]` to ensure
    // TypeScript doesn't infer it as `string[]`, which would cause a type error.
    const departmentMap = new Map<string, string>(departments.map((dept): [string, string] => [dept.id, dept.name]));
    
    // Enrich user data with department names from our map.
    return users.map(user => ({
        ...user,
        department_name: user.department_id ? departmentMap.get(user.department_id) : undefined,
    })) as User[];
};

export const deleteUser = async (userId: string): Promise<void> => {
    // Call the secure edge function to delete the user from auth.users
    const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
    });

    if (error) {
        throw new Error(`Failed to delete user: ${data?.error || error.message}`);
    }
};


// --- Department API ---

export const getDepartments = async (): Promise<Department[]> => {
    const { data, error } = await supabase.from('departments').select('id, name').order('name');
    if (error) throw error;
    return data;
};

export const addDepartment = async (name: string): Promise<Department> => {
    const { data, error } = await supabase
        .from('departments')
        .insert({ name })
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateDepartment = async (id: string, name: string): Promise<Department> => {
    const { data, error } = await supabase
        .from('departments')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteDepartment = async (id: string): Promise<void> => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
};


// --- Notes API (now querying 'notes' table directly) ---

const NOTE_COLUMNS = 'id, title, file_path, faculty_id, department_id, created_at';

export const getAllNotes = async (): Promise<Note[]> => {
    const { data, error } = await supabase
        .from('notes')
        .select(NOTE_COLUMNS)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const getNotesForStudent = async (departmentId: string): Promise<Note[]> => {
    const { data, error } = await supabase
        .from('notes')
        .select(NOTE_COLUMNS)
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const getNotesByFaculty = async (facultyId: string): Promise<Note[]> => {
    const { data, error } = await supabase
        .from('notes')
        .select(NOTE_COLUMNS)
        .eq('faculty_id', facultyId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const uploadNote = async (title: string, file: File, facultyId: string, departmentId: string): Promise<void> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${facultyId}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('notes').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
        .from('notes')
        .insert({
            title,
            file_path: fileName,
            faculty_id: facultyId,
            department_id: departmentId,
        });
    
    if (insertError) {
      // If DB insert fails, try to clean up the uploaded file.
      await supabase.storage.from('notes').remove([fileName]);
      throw insertError;
    }
};

export const deleteNote = async (noteId: string, filePath: string): Promise<void> => {
    const { error: storageError } = await supabase.storage.from('notes').remove([filePath]);
    if (storageError) {
        console.error("Could not delete file from storage, but proceeding to delete DB record", storageError);
    }
    
    const { error: dbError } = await supabase.from('notes').delete().eq('id', noteId);
    if (dbError) throw dbError;
};

// --- Gemini API via Supabase Edge Function ---
export const generateQuizFromText = async (noteText: string): Promise<QuizQuestion[]> => {
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { noteText },
    });

    if (error) {
        // The edge function should return a structured error, but we handle network/invoke errors too.
        throw new Error(`Quiz generation failed: ${data?.error || error.message}`);
    }

    if (!Array.isArray(data)) {
        console.error("Unexpected response from quiz function:", data);
        throw new Error("The quiz generator returned an invalid format.");
    }
    
    return data as QuizQuestion[];
};
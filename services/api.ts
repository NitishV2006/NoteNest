

import { supabase } from './supabase';
import { User, Note, Department, UserRole } from '../types';

// --- Auth API ---

export const login = async (email: string, pass: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: pass,
    });
    if (error) throw error;
};

export const register = async (name: string, email: string, pass: string, role: string) => {
    return supabase.auth.signUp({
        email: email.toLowerCase().trim(),
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

export const updateUserPassword = async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
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
    const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, name, email, role, department_id');

    if (usersError) throw usersError;
    if (!users) return [];

    const departments = await getDepartments().catch(error => {
        console.warn("Could not fetch departments for admin user list.", error);
        return [];
    });
    
    const departmentMap = new Map<string, string>(departments.map((dept): [string, string] => [dept.id, dept.name]));
    
    return users.map(user => ({
        ...user,
        department_name: user.department_id ? departmentMap.get(user.department_id) : undefined,
    })) as User[];
};

export const deleteUser = async (userId: string): Promise<void> => {
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


// --- Notes API ---

/**
 * [RE-ARCHITECTED] Fetches all notes by calling a secure RPC database function.
 * This is the definitive fix for all note-fetching errors.
 */
export const getAllNotes = async (): Promise<Note[]> => {
    const { data, error } = await supabase.rpc('get_all_notes_with_details');
    
    if (error) {
        console.error("RPC Error fetching all notes:", JSON.stringify(error, null, 2));
        
        let userMessage = `Failed to fetch notes due to a database error. Please contact an administrator.`;
        
        // PGRST202: PostgREST error for "routine not found"
        // 42883: Postgres native error for 'undefined_function'
        if (error.code === 'PGRST202' || error.code === '42883') {
            userMessage = `Database function missing: The app requires a function named 'get_all_notes_with_details' to fetch notes, but it was not found.`;
            userMessage += `\n\nACTION REQUIRED: An administrator must run the setup SQL script in the Supabase SQL Editor to create this function. You can ask the AI assistant for the correct SQL query.`;
        } else if (error.message.includes('permission denied')) {
            userMessage = `Database permission error: Your user role does not have permission to run the 'get_all_notes_with_details' function.`;
            userMessage += `\n\nACTION REQUIRED: An administrator must grant EXECUTE permission on this function to the 'authenticated' role.`;
        }
        
        const details = `Technical Details: ${error.message} (Code: ${error.code})`;
        throw new Error(`${userMessage}\n\n${details}`);
    }
    return (data as Note[]) || [];
};


/**
 * [FIXED] Fetches notes for a specific faculty member by calling the main RPC function
 * and filtering the results on the client side. This ensures consistency and leverages
 * the robust, RLS-safe data fetching method.
 */
export const getNotesByFaculty = async (facultyId: string): Promise<Note[]> => {
    const allNotes = await getAllNotes();
    return allNotes.filter(note => note.faculty_id === facultyId);
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
      await supabase.storage.from('notes').remove([fileName]);
      throw insertError;
    }
};

export const updateNote = async (noteId: string, title: string): Promise<Note> => {
    const { data, error } = await supabase
        .from('notes')
        .update({ title })
        .eq('id', noteId)
        .select()
        .single();

    if (error) throw error;
    if (!data) throw new Error("Note not found or permission denied.");
    return data;
};

/**
 * Deletes a note by invoking a secure Edge Function.
 */
export const deleteNote = async (noteId: string): Promise<void> => {
    const { error } = await supabase.functions.invoke('delete-note', {
        body: { noteId },
    });

    if (error) {
        // @ts-ignore
        const functionError = error.context?.function_error || error.message;
        throw new Error(`Failed to delete note: ${functionError}`);
    }
};

// --- Count API for Dashboard Stats ---

export const getUsersCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
}

export const getNotesCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('notes').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
}

export const getDepartmentsCount = async (): Promise<number> => {
    const { count, error } = await supabase.from('departments').select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
}
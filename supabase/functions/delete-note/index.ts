
// Manual type declaration for Deno namespace to prevent type errors.
declare const Deno: {
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): { finished: Promise<void> };
  env: {
    get(key: string): string | undefined;
  };
};

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Not authenticated. Please log in again.' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found. Cannot authorize.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { noteId } = await req.json();
    if (!noteId || typeof noteId !== 'string') {
      throw new Error("Invalid or missing 'noteId' in request body.");
    }
    
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: note, error: fetchError } = await adminClient
        .from('notes')
        .select('file_path, faculty_id')
        .eq('id', noteId)
        .single();
        
    if (fetchError) {
      throw new Error(`Note with ID ${noteId} not found.`);
    }

    if (profile.role !== 'admin' && note.faculty_id !== user.id) {
       return new Response(JSON.stringify({ error: 'You are not authorized to delete this note.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (note.file_path) {
        const { error: storageError } = await adminClient.storage.from('notes').remove([note.file_path]);
        if (storageError) {
            console.error(`Storage deletion failed for path "${note.file_path}":`, storageError.message);
        }
    }

    const { error: dbError } = await adminClient.from('notes').delete().eq('id', noteId);
    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ message: 'Note deleted successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in delete-note function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: `Function execution failed: ${errorMessage}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Use 500 for internal server errors
    });
  }
});
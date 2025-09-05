// DEPRECATED: This Edge Function is no longer in use.
// The logic has been moved to a more reliable and performant RPC database function
// called `get_all_notes_with_details` to resolve critical stability issues.
// This file is left to avoid breaking existing deployment configurations but should not be called.

// Fix: Add a manual type declaration for the Deno namespace.
// This resolves "Cannot find name 'Deno'" errors in environments
// where Deno's native types are not automatically available.
declare const Deno: {
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): { finished: Promise<void> };
};

Deno.serve(async (req) => {
  const errorResponse = {
    error: "This function is deprecated and should not be called. Please use the 'get_all_notes_with_details' RPC function instead."
  };
  return new Response(JSON.stringify(errorResponse), {
    headers: { 'Content-Type': 'application/json' },
    status: 410, // 410 Gone
  });
});
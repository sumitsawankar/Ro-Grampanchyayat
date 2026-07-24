// Configuration for connecting directly to Supabase from the browser.
// If you want to bypass the local Node server and communicate directly with Supabase,
// replace the placeholders below with your Supabase project credentials.
//
// If you leave these placeholders as they are, the application will automatically
// fall back to routing all requests through your Node backend server (/api/tickets).

window.SUPABASE_CONFIG = {
    SUPABASE_URL: "https://xhwyluieofmxmfrlychp.supabase.co", 
    SUPABASE_KEY: "sb_publishable_vX7YBq4lL2Rh72GzTd-s-w_Tu9kwYZr" 
};

// Helper function to initialize and return Supabase client if configured
window.getSupabaseClient = () => {
    const config = window.SUPABASE_CONFIG;
    const isConfigured = 
        config && 
        config.SUPABASE_URL && 
        config.SUPABASE_URL !== 'https://YOUR_PROJECT_ID.supabase.co' &&
        !config.SUPABASE_URL.includes('placeholder') &&
        config.SUPABASE_KEY && 
        config.SUPABASE_KEY !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6...' &&
        !config.SUPABASE_KEY.includes('placeholder');

    if (isConfigured) {
        try {
            return window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        } catch (err) {
            console.error('Failed to initialize Supabase client directly in browser:', err);
        }
    }
    return null;
};

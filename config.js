/**
 * E-LMIS AUE - Supabase Configuration
 * 
 * Replace the two values below with your actual Supabase project credentials.
 * Obtain these from: Supabase Dashboard -> Project Settings -> API
 * 
 * IMPORTANT SECURITY NOTE:
 * - Only use your Project URL and Publishable (anon) Key here.
 * - NEVER use your service_role (secret) key on the frontend!
 */

const SUPABASE_URL = "https://gvrqkvfuwlhghsvrwboc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cnFrdmZ1d2xoZ2hzdnJ3Ym9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNjMwODYsImV4cCI6MjEwNTYzOTA4Nn0.Jh83ZGlIt4BhHnBIXkrbsfMy_8U62XKgAFxaF2jIJp4";

// Default Application Settings (Loaded dynamically from Supabase `settings` table)
const DEFAULT_CONFIG = {
  WEBSITE_NAME: "E-LMIS AUE",
  PORTAL_SUBTITLE: "የስራ እድል ምዝገባ እና አመልካች አስተዳደር ስርዓት",
  PHONE_NUMBER: "0924865172",
  BANK_ACCOUNT_NUMBER: "1000671389712",
  REGISTRATION_FEE: "3,800 ETB",
  PROCESSING_FEE: "18,200 ETB",
  BANK_STATEMENT_FEE: "46,300 ETB",
  BANK_STATEMENT_TEXT: "ተመላሽ ክፍያ (Refundable Payment)",
  FOOTER_ABOUT: "E-LMIS AUE የስራ እድል ምዝገባ እና አመልካች አስተዳደር ስርዓት - ለዱባይ፣ ኩዌት፣ ኳታር እና ሳውዲ አረቢያ የስራ እድል ፈላጊዎች የተዘጋጀ ይፋዊ መድረክ።"
};

// Check if credentials have been replaced with valid project values
const isConfigured = 
  SUPABASE_URL && 
  SUPABASE_PUBLISHABLE_KEY && 
  SUPABASE_URL !== "YOUR_SUPABASE_URL" && 
  !SUPABASE_URL.includes("your-project-ref");

// Global Supabase client instance
let supabaseClient = null;

if (window.supabase && typeof window.supabase.createClient === "function") {
  if (isConfigured) {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      console.log("âœ… Supabase client initialized with live project:", SUPABASE_URL);
    } catch (err) {
      console.warn("âš ï¸ Failed to initialize Supabase client:", err);
    }
  } else {
    console.info("â„¹ï¸ Supabase is not configured yet with live credentials in config.js. Operating in demo-ready preview mode. Update config.js to connect to your live Supabase project.");
  }
}

// Export global helper
window.ELMIS = {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  isConfigured,
  getClient: () => supabaseClient,
  defaults: DEFAULT_CONFIG
};

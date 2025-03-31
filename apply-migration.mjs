// Apply the migration to add the needs_setup column to review_sessions table
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  try {
    console.log('Adding needs_setup column to review_sessions table...');
    
    // Create a SQL query using the Supabase PostgreSQL interface
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        -- Add needs_setup column to review_sessions table
        ALTER TABLE review_sessions
        ADD COLUMN IF NOT EXISTS needs_setup BOOLEAN DEFAULT TRUE;
        
        -- Create index for the new column
        CREATE INDEX IF NOT EXISTS idx_review_sessions_needs_setup ON review_sessions(needs_setup);
        
        -- Update existing records to set needs_setup to false if they have articles or files
        UPDATE review_sessions
        SET needs_setup = FALSE
        WHERE articles_count > 0 OR files_count > 0;
      `
    });

    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigration(); 
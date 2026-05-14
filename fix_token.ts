import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixToken() {
  const { data, error } = await supabaseAdmin.from('tokens').select('*').eq('service', 'instagram').single();
  if (error) {
    console.error('Error fetching token:', error);
    return;
  }
  console.log('Current token:', data.token);
  if (data.token.includes('ここに入力')) {
    const newToken = data.token.replace('ここに入力', '').trim();
    console.log('Fixing token...');
    const { error: updateError } = await supabaseAdmin.from('tokens').update({ token: newToken }).eq('service', 'instagram');
    if (updateError) {
      console.error('Error updating token:', updateError);
    } else {
      console.log('Token successfully fixed!');
    }
  } else {
    console.log('Token does not contain "ここに入力".');
  }
}

fixToken();

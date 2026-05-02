import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv() {
  const content = fs.readFileSync('.env.development.local', 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
    }
  });
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Checking DB token...");
  const { data, error } = await supabase.from('tokens').select('*').eq('service', 'instagram').single();
  if (error || !data) {
    console.error("No token found or error", error);
    return;
  }
  const token = data.token;
  console.log("Token found. Checking Facebook Pages...");

  const res = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`);
  const pagesData = await res.json();
  
  if (!pagesData.data) {
    console.error("No pages found or error:", pagesData);
    return;
  }
  
  let correctIgId = null;
  console.log("Pages found:");
  for (const page of pagesData.data) {
    console.log(`- Page: ${page.name} (${page.id})`);
    const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${token}`);
    const igData = await igRes.json();
    if (igData.instagram_business_account) {
      console.log(`  -> Instagram Business Account ID: ${igData.instagram_business_account.id}`);
      correctIgId = igData.instagram_business_account.id;
    } else {
      console.log(`  -> No Instagram Business Account attached.`);
    }
  }

  const currentId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  console.log("------------------------");
  console.log(`Current INSTAGRAM_BUSINESS_ACCOUNT_ID in env: ${currentId}`);
  if (correctIgId && currentId !== correctIgId) {
    console.log("❌ MISMATCH DETECTED!");
    console.log(`Please change your env to: INSTAGRAM_BUSINESS_ACCOUNT_ID=${correctIgId}`);
  } else if (correctIgId && currentId === correctIgId) {
    console.log("✅ ID MATCHES!");
  }
}
run();

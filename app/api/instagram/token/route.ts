import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // トークンを検証（簡単なチェック）
    if (token.length < 50) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    // 60日後の有効期限
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const { error } = await supabaseAdmin
      .from('tokens')
      .upsert({
        service: 'instagram',
        token,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Token saved successfully' });
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tokens')
      .select('expires_at, updated_at')
      .eq('service', 'instagram')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json({
      expires_at: data.expires_at,
      updated_at: data.updated_at
    });
  } catch (error) {
    console.error('Error fetching token info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
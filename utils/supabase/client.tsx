import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// 创建 Supabase 客户端单例
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient(supabaseUrl, publicAnonKey);
  }
  return supabaseInstance;
}

// 认证相关函数
export async function checkEmailExists(email: string) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/check-email`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '检测邮箱失败');
  }

  return await response.json();
}

export async function signUp(email: string, password: string, name?: string, userData?: any) {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/signup`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password,
        name,
        ...userData
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '注册失败');
  }

  return await response.json();
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Email verification
export async function resendVerificationEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  
  if (error) throw error;
  return { success: true, message: '验证邮件已发送' };
}

// Password reset
export async function sendPasswordResetEmail(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) throw error;
  return { success: true, message: '密码重置邮件已发送，请检查您的邮箱' };
}

// Reset password with token
export async function resetPassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) throw error;
  return { success: true, message: '密码已成功重置' };
}

// Verify email with token
export async function verifyEmail(token: string, type: 'signup' | 'email_change' = 'signup') {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: type,
  });
  
  if (error) throw error;
  return { success: true, message: '邮箱验证成功' };
}

export async function getSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const supabase = createClient();
  
  // 首先检查是否有会话
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return null;
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    // 如果是会话缺失错误，返回 null 而不是抛出错误
    if (error.message.includes('session_missing') || error.message.includes('Auth session missing')) {
      return null;
    }
    throw error;
  }
  return user;
}

export async function updateUserProfile(profileData: {
  name?: string;
  company?: string;
  phone?: string;
  role?: string;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('未登录');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/update-profile`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '更新失败');
  }

  return await response.json();
}

// ORCID OAuth login
export async function signInWithORCID() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/orcid/auth-url?mode=login`,
    {
      method: 'GET',
      headers: {
        'Origin': window.location.origin,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ORCID授权URL生成失败');
  }

  const { authUrl, redirectUri } = await response.json();
  
  // Store redirect URI for callback
  sessionStorage.setItem('orcid_redirect_uri', redirectUri);
  
  // Redirect to ORCID authorization page
  window.location.href = authUrl;
}

// ORCID Bind - 绑定ORCID到现有账户
export async function bindORCID() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/orcid/auth-url?mode=bind`,
    {
      method: 'GET',
      headers: {
        'Origin': window.location.origin,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ORCID授权URL生成失败');
  }

  const { authUrl, redirectUri } = await response.json();
  
  // Store redirect URI for bind callback
  sessionStorage.setItem('orcid_bind_redirect_uri', redirectUri);
  
  // Redirect to ORCID authorization page
  window.location.href = authUrl;
}

// Handle ORCID bind callback
export async function handleORCIDBindCallback(code: string) {
  const redirectUri = sessionStorage.getItem('orcid_bind_redirect_uri');
  
  if (!redirectUri) {
    throw new Error('ORCID重定向URI未找到');
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法绑定ORCID');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/orcid/bind`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ORCID绑定失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('orcid_bind_redirect_uri');
  
  return data;
}

// Unbind ORCID
export async function unbindORCID() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法解绑ORCID');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/orcid/unbind`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ORCID解绑失败');
  }

  const data = await response.json();
  return data;
}

// Google Sign In - 使用Google登录
export async function signInWithGoogle() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/google/auth-url?mode=login`,
    {
      method: 'GET',
      headers: {
        'Origin': window.location.origin,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google授权URL生成失败');
  }

  const { authUrl, redirectUri } = await response.json();
  
  // Store redirect URI for callback
  sessionStorage.setItem('google_redirect_uri', redirectUri);
  
  // Redirect to Google authorization page
  window.location.href = authUrl;
}

// Handle Google login callback
export async function handleGoogleCallback(code: string) {
  const redirectUri = sessionStorage.getItem('google_redirect_uri');
  
  if (!redirectUri) {
    throw new Error('Google重定向URI未找到');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/google/callback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ code, redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google登录失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('google_redirect_uri');
  
  // Sign in with the access token from server
  if (data.access_token) {
    const supabase = createClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.access_token, // Using same token as refresh for simplicity
    });
    
    if (sessionError) {
      throw new Error('创建会话失败');
    }
  }
  
  return data;
}

// Google Bind - 绑定Google到现有账户
export async function bindGoogle() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/google/auth-url?mode=bind`,
    {
      method: 'GET',
      headers: {
        'Origin': window.location.origin,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google授权URL生成失败');
  }

  const { authUrl, redirectUri } = await response.json();
  
  // Store redirect URI for bind callback
  sessionStorage.setItem('google_bind_redirect_uri', redirectUri);
  
  // Redirect to Google authorization page
  window.location.href = authUrl;
}

// Handle Google bind callback
export async function handleGoogleBindCallback(code: string) {
  const redirectUri = sessionStorage.getItem('google_bind_redirect_uri');
  
  if (!redirectUri) {
    throw new Error('Google重定向URI未找到');
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法绑定Google账号');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/google/bind-callback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google绑定失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('google_bind_redirect_uri');
  
  return data;
}

// Unbind Google
export async function unbindGoogle() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法解绑Google账号');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/google/unbind`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google账号解绑失败');
  }

  const data = await response.json();
  return data;
}

// ===== GitHub OAuth Functions =====

// GitHub Sign In - 使用GitHub登录
export async function signInWithGitHub() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/github/auth-url?mode=login`,
    {
      method: 'GET',
      headers: {
        'Origin': window.location.origin,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'GitHub授权URL生成失败');
  }

  const { authUrl, redirectUri } = await response.json();
  
  // Store redirect URI for callback
  sessionStorage.setItem('github_redirect_uri', redirectUri);
  
  // Redirect to GitHub authorization page
  window.location.href = authUrl;
}

// Handle GitHub login callback
export async function handleGitHubCallback(code: string) {
  const redirectUri = sessionStorage.getItem('github_redirect_uri');
  
  if (!redirectUri) {
    throw new Error('GitHub重定向URI未找到');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/github/callback`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ code, redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'GitHub登录失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('github_redirect_uri');
  
  // Sign in with the access token from server
  if (data.access_token) {
    const supabase = createClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.access_token, // Using same token as refresh for simplicity
    });
    
    if (sessionError) {
      throw new Error('创建会话失败');
    }
  }
  
  return data;
}

// GitHub Bind - 绑定GitHub到现有账户
export async function bindGitHub() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/github/auth-url?mode=bind`,
    {
      method: 'GET',
      headers: {
        'Origin': window.location.origin,
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'GitHub授权URL生成失败');
  }

  const { authUrl, redirectUri } = await response.json();
  
  // Store redirect URI for bind callback
  sessionStorage.setItem('github_bind_redirect_uri', redirectUri);
  
  // Redirect to GitHub authorization page
  window.location.href = authUrl;
}

// Handle GitHub bind callback
export async function handleGitHubBindCallback(code: string) {
  const redirectUri = sessionStorage.getItem('github_bind_redirect_uri');
  
  if (!redirectUri) {
    throw new Error('GitHub重定向URI未找到');
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法绑定GitHub账号');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/github/bind-callback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'GitHub绑定失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('github_bind_redirect_uri');
  
  return data;
}

// Unbind GitHub
export async function unbindGitHub() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法解绑GitHub账号');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/github/unbind`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'GitHub账号解绑失败');
  }

  const data = await response.json();
  return data;
}

// ===== Twitter/X OAuth Functions =====

// Sign in with Twitter
export async function signInWithTwitter() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/twitter/auth-url?mode=login`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取Twitter授权URL失败');
  }

  const data = await response.json();
  
  // Store code verifier for later use in callback
  sessionStorage.setItem('twitter_code_verifier', data.codeVerifier);
  sessionStorage.setItem('twitter_redirect_uri', data.redirectUri);
  
  // Redirect to Twitter authorization page
  window.location.href = data.authUrl;
}

// Handle Twitter OAuth callback (login)
export async function handleTwitterCallback(code: string) {
  const codeVerifier = sessionStorage.getItem('twitter_code_verifier');
  const redirectUri = sessionStorage.getItem('twitter_redirect_uri');
  
  if (!codeVerifier || !redirectUri) {
    throw new Error('Twitter验证信息未找到');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/twitter/callback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri, codeVerifier }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Twitter授权失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('twitter_code_verifier');
  sessionStorage.removeItem('twitter_redirect_uri');
  
  if (data.access_token) {
    const supabase = createClient();
    
    // Create session using the user ID as token
    // This is a workaround since we're using admin API
    const { data: session, error } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.access_token,
    });
    
    if (error) {
      console.error('Session creation error:', error);
      throw new Error('会话创建失败');
    }
    
    return session;
  }
  
  throw new Error('Twitter登录失败');
}

// Bind Twitter account to existing user
export async function bindTwitter() {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/twitter/auth-url?mode=bind`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取Twitter授权URL失败');
  }

  const data = await response.json();
  
  // Store code verifier for later use in callback
  sessionStorage.setItem('twitter_bind_code_verifier', data.codeVerifier);
  sessionStorage.setItem('twitter_bind_redirect_uri', data.redirectUri);
  
  // Redirect to Twitter authorization page
  window.location.href = data.authUrl;
}

// Handle Twitter bind callback
export async function handleTwitterBindCallback(code: string) {
  const codeVerifier = sessionStorage.getItem('twitter_bind_code_verifier');
  const redirectUri = sessionStorage.getItem('twitter_bind_redirect_uri');
  
  if (!codeVerifier || !redirectUri) {
    throw new Error('Twitter验证信息未找到');
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法绑定Twitter账号');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/twitter/bind-callback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri, codeVerifier }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Twitter账号绑定失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('twitter_bind_code_verifier');
  sessionStorage.removeItem('twitter_bind_redirect_uri');
  
  return data;
}

// Unbind Twitter
export async function unbindTwitter() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('未登录，无法解绑Twitter账号');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/twitter/unbind`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Twitter账号解绑失败');
  }

  const data = await response.json();
  return data;
}

export async function handleORCIDCallback(code: string) {
  const redirectUri = sessionStorage.getItem('orcid_redirect_uri');
  
  if (!redirectUri) {
    throw new Error('ORCID重定向URI未找到');
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/orcid/callback`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, redirectUri }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ORCID授权失败');
  }

  const data = await response.json();
  
  // Clean up storage
  sessionStorage.removeItem('orcid_redirect_uri');
  
  // Extract token from the magic link
  if (data.authUrl) {
    const url = new URL(data.authUrl);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');
    
    if (token && type) {
      const supabase = createClient();
      const { data: sessionData, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any,
      });
      
      if (error) {
        throw new Error('会话创建失败');
      }
      
      return sessionData.session;
    }
  }
  
  throw new Error('ORCID登录失败');
}

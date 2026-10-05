import { createClient } from '@supabase/supabase-js';
import { McsError } from '../shared/errors.mjs';

// One client per operation: a singleton client would share identities between requests.
export class SupabaseProvider {
  constructor(config) { this.config = config; }
  client(storage = {}) {
    return createClient(this.config.url, this.config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce',
        storage: { getItem: key => storage[key] ?? null, setItem: (key, value) => { storage[key] = value; }, removeItem: key => { delete storage[key]; } } },
      global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
    });
  }
  unwrap({ data, error }) {
    if (error) {
      if (error.status === 429) throw new McsError('RATE_LIMITED', '尝试过于频繁，请稍后重试。', 429);
      if (!error.status || error.status >= 500) throw new McsError('AUTH_UNAVAILABLE', '登录服务暂时无法连接，请稍后重试。', 503);
      throw new McsError('AUTH_REJECTED', '验证未通过，请核对登录信息或重新获取验证邮件。', 401);
    }
    return data;
  }
  async login(email, password) { return this.unwrap(await this.client().auth.signInWithPassword({ email, password })); }
  async signup(email, password, redirectTo) { return this.unwrap(await this.client().auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })); }
  async recover(email, redirectTo) { return this.unwrap(await this.client().auth.resetPasswordForEmail(email, { redirectTo })); }
  async confirm(token_hash, type) { return this.unwrap(await this.client().auth.verifyOtp({ token_hash, type })); }
  async user(access) { return this.unwrap(await this.client().auth.getUser(access)).user; }
  async refresh(refresh_token) { return this.unwrap(await this.client().auth.refreshSession({ refresh_token })); }
  async oauthStart(redirectTo) {
    const storage = {};
    const data = this.unwrap(await this.client(storage).auth.signInWithOAuth({ provider: 'github', options: { redirectTo, skipBrowserRedirect: true } }));
    return { url: data.url, storage };
  }
  async oauthFinish(code, storage) { return this.unwrap(await this.client(storage).auth.exchangeCodeForSession(code)); }
  async password(session, password) {
    const client = this.client();
    this.unwrap(await client.auth.setSession(session));
    return this.unwrap(await client.auth.updateUser({ password }));
  }
  async logout(session) {
    const client = this.client();
    this.unwrap(await client.auth.setSession(session));
    this.unwrap(await client.auth.signOut({ scope: 'local' }));
  }
}

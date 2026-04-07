/**
 * Database service — All Supabase CRUD operations
 */
import { supabase } from './supabase';

// ─── Helpers ────────────────────────────────────
function handleError(error, context) {
  console.error(`[DB] ${context}:`, error);
  throw error;
}

// ─── Auth / Profile ─────────────────────────────
export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) handleError(error, 'getCurrentProfile');
  return data;
}

export async function getAllProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) handleError(error, 'getAllProfiles');
  return data || [];
}

export async function updateProfile(id, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) handleError(error, 'updateProfile');
  return data;
}

// ─── Clients ────────────────────────────────────
export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleError(error, 'getClients');
  return data || [];
}

export async function getClientById(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) handleError(error, 'getClientById');
  return data;
}

export async function createClient(client) {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single();
  if (error) handleError(error, 'createClient');
  return data;
}

export async function updateClient(id, updates) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) handleError(error, 'updateClient');
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) handleError(error, 'deleteClient');
}

export async function getClientsWithFlags() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .not('flags', 'eq', '[]');
  if (error) handleError(error, 'getClientsWithFlags');
  return (data || []).filter(c => {
    try {
      const flags = typeof c.flags === 'string' ? JSON.parse(c.flags) : c.flags;
      return Array.isArray(flags) && flags.length > 0;
    } catch { return false; }
  });
}

// ─── Intake Forms ───────────────────────────────
export async function getIntakeByClientId(clientId) {
  const { data, error } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) handleError(error, 'getIntakeByClientId');
  return data;
}

export async function upsertIntake(clientId, intake) {
  const existing = await getIntakeByClientId(clientId);
  if (existing) {
    const { data, error } = await supabase
      .from('intake_forms')
      .update({ ...intake, client_id: clientId })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) handleError(error, 'updateIntake');
    return data;
  } else {
    const { data, error } = await supabase
      .from('intake_forms')
      .insert({ ...intake, client_id: clientId })
      .select()
      .single();
    if (error) handleError(error, 'createIntake');
    return data;
  }
}

// ─── Sessions ───────────────────────────────────
export async function getSessionsByClientId(clientId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false });
  if (error) handleError(error, 'getSessionsByClientId');
  return data || [];
}

export async function getSessionById(id) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) handleError(error, 'getSessionById');
  return data;
}

export async function getAllSessions() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('date', { ascending: false });
  if (error) handleError(error, 'getAllSessions');
  return data || [];
}

export async function createSession(session) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single();
  if (error) handleError(error, 'createSession');
  return data;
}

export async function updateSession(id, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) handleError(error, 'updateSession');
  return data;
}

// ─── Hypotheses ─────────────────────────────────
export async function getHypothesesBySessionId(sessionId) {
  const { data, error } = await supabase
    .from('hypotheses')
    .select('*')
    .eq('session_id', sessionId)
    .order('priority', { ascending: true });
  if (error) handleError(error, 'getHypothesesBySessionId');
  return data || [];
}

export async function createHypothesis(hypothesis) {
  const { data, error } = await supabase
    .from('hypotheses')
    .insert(hypothesis)
    .select()
    .single();
  if (error) handleError(error, 'createHypothesis');
  return data;
}

export async function updateHypothesis(id, updates) {
  const { data, error } = await supabase
    .from('hypotheses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) handleError(error, 'updateHypothesis');
  return data;
}

export async function deleteHypothesis(id) {
  const { error } = await supabase.from('hypotheses').delete().eq('id', id);
  if (error) handleError(error, 'deleteHypothesis');
}

// ─── Interventions ──────────────────────────────
export async function getInterventionsBySessionId(sessionId) {
  const { data, error } = await supabase
    .from('interventions')
    .select('*')
    .eq('session_id', sessionId);
  if (error) handleError(error, 'getInterventionsBySessionId');
  return data || [];
}

export async function createIntervention(intervention) {
  const { data, error } = await supabase
    .from('interventions')
    .insert(intervention)
    .select()
    .single();
  if (error) handleError(error, 'createIntervention');
  return data;
}

export async function updateIntervention(id, updates) {
  const { data, error } = await supabase
    .from('interventions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) handleError(error, 'updateIntervention');
  return data;
}

// ─── Audit Logs ─────────────────────────────────
export async function getAuditLogs(filters = {}) {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters.action && filters.action !== 'all') {
    query = query.eq('action', filters.action);
  }
  if (filters.userId && filters.userId !== 'all') {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;
  if (error) handleError(error, 'getAuditLogs');
  return data || [];
}

export async function createAuditLog(log) {
  const { error } = await supabase.from('audit_logs').insert(log);
  if (error) console.error('[Audit]', error); // Don't throw, auditing shouldn't block
}

// ─── Dashboard helpers ──────────────────────────
export async function getDashboardData() {
  const today = new Date().toISOString().split('T')[0];

  const [clientsRes, sessionsRes, flaggedRes] = await Promise.all([
    supabase.from('clients').select('*').eq('status', 'active'),
    supabase.from('sessions').select('*').order('date', { ascending: false }),
    getClientsWithFlags(),
  ]);

  const clients = clientsRes.data || [];
  const sessions = sessionsRes.data || [];
  const todaySessions = clients.filter(c => c.next_session_date === today);
  const inProgressSessions = sessions.filter(s => s.status === 'in_progress');

  return {
    clients,
    sessions,
    todaySessions,
    inProgressSessions,
    flaggedClients: flaggedRes,
    activeCount: clients.length,
  };
}

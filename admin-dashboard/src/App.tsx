import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Shield, MapPin, Check, X, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Complaint {
  id: string;
  category: string;
  description: string;
  location_addr: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

function App() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchComplaints();
    
    // Real-time subscription
    const subscription = supabase
      .channel('complaints_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        fetchComplaints();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setComplaints(data);
      if (error) throw error;
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      fetchComplaints();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const deleteComplaint = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      const { error } = await supabase.from('complaints').delete().eq('id', id);
      if (error) throw error;
      fetchComplaints();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const filteredComplaints = complaints.filter(c => filter === 'all' ? true : c.status === filter);

  return (
    <div className="dashboard">
      <header className="header">
        <h1 className="title">
          <Shield size={32} className="text-sos" style={{ color: 'var(--sos)' }} />
          SafeStree Admin Dashboard
        </h1>
        <div className="actions">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="btn"
            style={{ background: 'var(--card)', color: 'white', border: '1px solid var(--border)' }}
          >
            <option value="all">All Reports</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={fetchComplaints} className="btn btn-reject">Refresh</button>
        </div>
      </header>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-label">Total Reports</div>
          <div className="stat-value">{complaints.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Review</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {complaints.filter(c => c.status === 'pending').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved (Unsafe Spots)</div>
          <div className="stat-value" style={{ color: 'var(--safe)' }}>
            {complaints.filter(c => c.status === 'approved').length}
          </div>
        </div>
      </div>

      <div className="complaints-list">
        {loading && <div className="empty-state">Loading complaints...</div>}
        {!loading && filteredComplaints.length === 0 && (
          <div className="empty-state">No complaints found for the selected filter.</div>
        )}
        {filteredComplaints.map(c => (
          <div key={c.id} className="complaint-card">
            <div className="card-header">
              <div className="category">
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                {c.category}
              </div>
              <span className={`status-badge status-${c.status}`}>
                {c.status}
              </span>
            </div>
            
            <p className="description">{c.description}</p>
            
            <div className="location">
              <MapPin size={14} />
              {c.location_addr}
              {c.latitude && <span style={{ marginLeft: '10px' }}>({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})</span>}
            </div>

            <div className="card-header" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div className="location" style={{ marginBottom: 0 }}>
                <Clock size={14} />
                {format(new Date(c.created_at), 'PPP p')}
              </div>
              
              <div className="actions">
                {c.status === 'pending' && (
                  <>
                    <button onClick={() => updateStatus(c.id, 'approved')} className="btn btn-approve">
                      <Check size={16} /> Approve
                    </button>
                    <button onClick={() => updateStatus(c.id, 'rejected')} className="btn btn-reject">
                      <X size={16} /> Reject
                    </button>
                  </>
                )}
                {c.status !== 'pending' && (
                   <button onClick={() => deleteComplaint(c.id)} className="btn btn-delete">
                     <Trash2 size={16} /> Delete
                   </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

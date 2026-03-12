import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Shield, MapPin, Trash2, AlertTriangle, 
  Clock, User, Phone, Mail, LayoutDashboard, 
  Bell, FileText, Users, ShieldCheck, 
  BarChart3, Settings as SettingsIcon, LogOut 
} from 'lucide-react';
import { format } from 'date-fns';
import GoogleMapReact from 'google-map-react';

type Tab = 'dashboard' | 'alerts' | 'incidents' | 'users' | 'safezones' | 'analytics';

interface Complaint {
  id: string;
  category: string;
  description: string;
  location_addr: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'approved' | 'rejected';
  user_email: string;
  user_name: string;
  user_phone: string;
  created_at: string;
}

interface Alert {
  id: string;
  user_name: string;
  user_phone: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'resolved';
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  phone_number: string;
  updated_at: string;
}

interface SafeZone {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number;
}

const MapMarker = ({ type, text }: { type: 'incident' | 'safe' | 'alert', text?: string, lat: number, lng: number }) => (
  <div style={{
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: type === 'alert' ? 100 : 1
  }}>
    <div style={{
      width: type === 'safe' ? 40 : 15,
      height: type === 'safe' ? 40 : 15,
      borderRadius: '50%',
      backgroundColor: type === 'safe' ? 'rgba(16, 185, 129, 0.4)' : (type === 'alert' ? 'var(--accent)' : 'rgba(244, 63, 94, 0.6)'),
      border: `2px solid ${type === 'safe' ? 'var(--safe)' : 'var(--accent)'}`,
      boxShadow: type === 'alert' ? '0 0 15px var(--accent)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {type === 'safe' && <ShieldCheck size={16} color="white" />}
    </div>
    {text && <span style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10, marginTop: 4, whiteSpace: 'nowrap' }}>{text}</span>}
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [newZone, setNewZone] = useState({ name: '', lat: 0, lng: 0, radius: 500 });

  const MAP_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    fetchData();
    const complaintsSub = supabase.channel('complaints-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchData)
      .subscribe();
    
    const alertsSub = supabase.channel('alerts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(complaintsSub);
      supabase.removeChannel(alertsSub);
    };
  }, []);

  async function fetchData() {
    const [cRes, aRes, pRes, sRes] = await Promise.all([
      supabase.from('complaints').select('*').order('created_at', { ascending: false }),
      supabase.from('emergency_alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('updated_at', { ascending: false }),
      supabase.from('safe_zones').select('*')
    ]);

    if (cRes.data) setComplaints(cRes.data);
    if (aRes.data) setAlerts(aRes.data);
    if (pRes.data) setProfiles(pRes.data);
    if (sRes.data) setSafeZones(sRes.data);
    setLoading(false);
  }

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('complaints').update({ status }).eq('id', id);
    fetchData();
  };

  const deleteComplaint = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      await supabase.from('complaints').delete().eq('id', id);
      fetchData();
    }
  };

  const resolveAlert = async (id: string) => {
    await supabase.from('emergency_alerts').update({ status: 'resolved' }).eq('id', id);
    fetchData();
  };

  const addSafeZone = async () => {
    if (!newZone.name || !newZone.lat) return;
    await supabase.from('safe_zones').insert([{
      name: newZone.name,
      latitude: newZone.lat,
      longitude: newZone.lng,
      radius: newZone.radius
    }]);
    setNewZone({ name: '', lat: 0, lng: 0, radius: 500 });
    fetchData();
  };

  const deleteSafeZone = async (id: string) => {
    await supabase.from('safe_zones').delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Shield className="sidebar-logo" size={32} />
          <span className="sidebar-title">SAFESTREE</span>
        </div>
        
        <nav className="nav-links">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
            <Bell size={20} /> 
            Emergency Alerts 
            {alerts.filter(a => a.status === 'active').length > 0 && (
              <span style={{ backgroundColor: '#fff', color: 'var(--accent)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginLeft: 'auto' }}>
                {alerts.filter(a => a.status === 'active').length}
              </span>
            )}
          </div>
          <div className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
            <FileText size={20} /> Incidents
          </div>
          <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={20} /> Users
          </div>
          <div className={`nav-item ${activeTab === 'safezones' ? 'active' : ''}`} onClick={() => setActiveTab('safezones')}>
            <ShieldCheck size={20} /> Safe Zones
          </div>
          <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart3 size={20} /> Analytics
          </div>
        </nav>

        <div className="nav-links" style={{ borderTop: '1px solid var(--border)', flex: 'none' }}>
          <div className="nav-item">
            <SettingsIcon size={20} /> Settings
          </div>
          <div className="nav-item" style={{ color: 'var(--accent)' }}>
            <LogOut size={20} /> Logout
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <h1 className="page-title">
            {activeTab === 'dashboard' && 'Safety Overview'}
            {activeTab === 'alerts' && 'Emergency Queue'}
            {activeTab === 'incidents' && 'Incident Moderation'}
            {activeTab === 'users' && 'Community Directory'}
            {activeTab === 'safezones' && 'Safe Zone Manager'}
            {activeTab === 'analytics' && 'Safety Trends'}
          </h1>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700 }}>Admin Panel</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Central Command</p>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
          </div>
        </header>

        {loading ? (
          <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle className="pulse" size={48} color="var(--accent)" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">Total Users</span>
                    <span className="stat-value">{profiles.length}</span>
                    <span className="stat-change up">+12% from last week</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Active SOS Alerts</span>
                    <span className="stat-value" style={{ color: 'var(--accent)' }}>{alerts.filter(a => a.status === 'active').length}</span>
                    <span className="stat-change down">-5% resolution time</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Pending Incidents</span>
                    <span className="stat-value" style={{ color: 'var(--warning)' }}>{complaints.filter(c => c.status === 'pending').length}</span>
                    <span className="stat-change">Awaiting moderation</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Approved Safe Spots</span>
                    <span className="stat-value" style={{ color: 'var(--safe)' }}>{complaints.filter(c => c.status === 'approved').length}</span>
                    <span className="stat-change up">+3 new zones</span>
                  </div>
                </div>

                <div className="heatmap-container" style={{ position: 'relative', height: '400px', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                  {MAP_KEY ? (
                    <GoogleMapReact
                      bootstrapURLKeys={{ key: MAP_KEY }}
                      defaultCenter={{ lat: 19.0760, lng: 72.8777 }}
                      defaultZoom={11}
                      options={{ styles: [
                        { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
                        { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
                        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
                        { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
                        { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] }
                      ] }}
                    >
                      {complaints.filter(c => c.status === 'approved').map(c => (
                        <MapMarker key={c.id} lat={c.latitude} lng={c.longitude} type="incident" />
                      ))}
                      {alerts.filter(a => a.status === 'active').map(a => (
                        <MapMarker key={a.id} lat={a.latitude} lng={a.longitude} type="alert" text={a.user_name} />
                      ))}
                      {safeZones.map(s => (
                        <MapMarker key={s.id} lat={s.latitude} lng={s.longitude} type="safe" text={s.name} />
                      ))}
                    </GoogleMapReact>
                  ) : (
                    <div style={{ 
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '1rem',
                      padding: '2rem'
                    }}>
                      <MapPin size={48} color="#ec4899" />
                      <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                        Map Visualization Unavailable
                      </h3>
                      <p style={{ color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                        Google Maps API key is missing or invalid
                      </p>
                      <div style={{ 
                        backgroundColor: 'rgba(236, 72, 153, 0.1)', 
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginTop: '1rem',
                        maxWidth: '500px'
                      }}>
                        <p style={{ color: '#d1d5db', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
                          <strong>To enable maps:</strong>
                        </p>
                        <ol style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0, paddingLeft: '1.5rem' }}>
                          <li>Go to Google Cloud Console</li>
                          <li>Enable Maps JavaScript API</li>
                          <li>Enable billing (free $200 credit)</li>
                          <li>Copy API key to .env file</li>
                          <li>Restart dashboard</li>
                        </ol>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.75rem', marginBottom: 0 }}>
                          See <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>GOOGLE_MAPS_FIX.md</code> for detailed instructions
                        </p>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899' }}>
                            {complaints.filter(c => c.status === 'approved').length}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Incidents</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899' }}>
                            {alerts.filter(a => a.status === 'active').length}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Active Alerts</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
                            {safeZones.length}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Safe Zones</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'alerts' && (
              <div className="complaints-list">
                {alerts.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No emergency alerts at the moment. All is safe.</p>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} className="alert-row" style={{ borderColor: a.status === 'active' ? 'var(--accent)' : 'var(--border)' }}>
                      <div className={a.status === 'active' ? 'alert-dot pulse' : ''} style={{ backgroundColor: a.status === 'active' ? 'var(--accent)' : 'var(--text-secondary)' }}></div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800 }}>{a.user_name || 'Anonymous SOS'}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.user_phone || 'No phone provided'}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        <Clock size={14} /> {format(new Date(a.created_at), 'HH:mm:ss, MMM d')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MapPin size={16} color="var(--accent)" />
                        <span style={{ fontSize: '0.9rem' }}>{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</span>
                      </div>
                      {a.status === 'active' && (
                        <button className="btn-approve" onClick={() => resolveAlert(a.id)}>Mark Resolved</button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="complaints-list">
                {complaints.map(c => (
                  <div key={c.id} className="complaint-card">
                    <div className="card-header">
                      <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{c.category}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {format(new Date(c.created_at), 'PPPp')}
                        </p>
                      </div>
                      <span className={`badge badge-${c.status}`}>{c.status}</span>
                    </div>

                    <p className="description">{c.description}</p>
                    
                    <div className="location" style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        <MapPin size={14} /> {c.location_addr}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {c.user_name || 'Unknown'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {c.user_phone || 'N/A'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {c.user_email || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="card-header" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: 0 }}>
                      <div className="btn-group">
                        {c.status === 'pending' && (
                          <>
                            <button className="btn-approve" onClick={() => updateStatus(c.id, 'approved')}>Approve</button>
                            <button className="btn-reject" onClick={() => updateStatus(c.id, 'rejected')}>Reject</button>
                          </>
                        )}
                        {c.status !== 'pending' && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Moderated</span>
                        )}
                      </div>
                      <button className="btn-delete" onClick={() => deleteComplaint(c.id)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="complaints-list">
                {profiles.map(p => (
                  <div key={p.id} className="alert-row">
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800 }}>{p.full_name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ID: {p.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 700 }}>{p.phone_number}</p>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '2rem' }}>
                      Joined {format(new Date(p.updated_at), 'MMM yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'safezones' && (
              <div>
                <div className="stat-card" style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Add New Safe Zone</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    <input className="input" style={{ width: '100%', backgroundColor: '#000', color: '#fff', padding: '10px' }} placeholder="Zone Name" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} />
                    <input className="input" style={{ width: '100%', backgroundColor: '#000', color: '#fff', padding: '10px' }} placeholder="Latitude" type="number" value={newZone.lat || ''} onChange={e => setNewZone({...newZone, lat: parseFloat(e.target.value)})} />
                    <input className="input" style={{ width: '100%', backgroundColor: '#000', color: '#fff', padding: '10px' }} placeholder="Longitude" type="number" value={newZone.lng || ''} onChange={e => setNewZone({...newZone, lng: parseFloat(e.target.value)})} />
                    <button className="btn-approve" onClick={addSafeZone}>Add Zone</button>
                  </div>
                </div>

                <div className="complaints-list">
                  {safeZones.map(z => (
                    <div key={z.id} className="alert-row">
                      <ShieldCheck color="var(--safe)" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 800 }}>{z.name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{z.latitude}, {z.longitude}</p>
                      </div>
                      <div>
                        <span className="badge badge-approved">{z.radius}m Radius</span>
                      </div>
                      <button className="btn-delete" onClick={() => deleteSafeZone(z.id)} style={{ marginLeft: '1rem' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div>
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                  <div className="stat-card">
                    <span className="stat-label">Total Incidents Reported</span>
                    <span className="stat-value">{complaints.length}</span>
                    <span className="stat-change">
                      {complaints.filter(c => c.status === 'approved').length} approved, {complaints.filter(c => c.status === 'pending').length} pending
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Emergency Alerts</span>
                    <span className="stat-value" style={{ color: 'var(--accent)' }}>{alerts.length}</span>
                    <span className="stat-change">
                      {alerts.filter(a => a.status === 'active').length} active, {alerts.filter(a => a.status === 'resolved').length} resolved
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Registered Users</span>
                    <span className="stat-value" style={{ color: 'var(--safe)' }}>{profiles.length}</span>
                    <span className="stat-change up">Growing community</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Safe Zones</span>
                    <span className="stat-value" style={{ color: 'var(--warning)' }}>{safeZones.length}</span>
                    <span className="stat-change">Across major cities</span>
                  </div>
                </div>

                <div className="stat-card" style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Incident Categories Breakdown</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {['Street Harassment', 'Poor Lighting', 'Suspicious Activity', 'Stalking', 'Workplace Harassment', 'Unsafe Public Transport', 'Safe Space', 'Emergency Help'].map(category => {
                      const count = complaints.filter(c => c.category === category).length;
                      const percentage = complaints.length > 0 ? (count / complaints.length * 100).toFixed(1) : 0;
                      return (
                        <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ minWidth: '180px', fontSize: '0.9rem', fontWeight: 600 }}>{category}</div>
                          <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--border)', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ 
                              width: `${percentage}%`, 
                              height: '100%', 
                              backgroundColor: category.includes('Safe') || category.includes('Help') ? 'var(--safe)' : 'var(--accent)',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 700 }}>
                            {count} ({percentage}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recent Activity</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Last 24 hours</span>
                        <span style={{ fontWeight: 700 }}>{complaints.filter(c => new Date(c.created_at) > new Date(Date.now() - 86400000)).length} incidents</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Last 7 days</span>
                        <span style={{ fontWeight: 700 }}>{complaints.filter(c => new Date(c.created_at) > new Date(Date.now() - 604800000)).length} incidents</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Last 30 days</span>
                        <span style={{ fontWeight: 700 }}>{complaints.filter(c => new Date(c.created_at) > new Date(Date.now() - 2592000000)).length} incidents</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Top Locations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {complaints.slice(0, 5).map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <MapPin size={12} color="var(--accent)" />
                          <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{c.location_addr?.split(',')[0] || 'Unknown'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

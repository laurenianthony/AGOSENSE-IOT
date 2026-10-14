import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUp, BatteryCharging, Check, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, Clock4, Cog, Database, Droplet,
  Gauge, LogOut, MapPin, Menu, PanelsTopLeft, RefreshCw, Send, ShieldAlert,
  Waves, X, LocateFixed,
} from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from './api/axios';
import Login from './components/Login';
import Register from './components/Register';

const CENTER = { latitude: 14.1417, longitude: 121.3167 };
const EMPTY_STATIONS = [];
const tabs = [
  { id: 'overview', label: 'Overview', icon: PanelsTopLeft },
  { id: 'telemetry', label: 'Live Sensor Readings', icon: Activity },
  { id: 'map', label: 'Station Map', icon: MapPin },
  { id: 'reports', label: 'Field Reports', icon: AlertTriangle },
  { id: 'history', label: 'Historical Records', icon: Database },
];

const formatValue = (value, digits = 1) => value == null || value === ''
  ? '--'
  : Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : value;
const readingFor = (station) => station?.latest_reading || station?.latestReading || station?.sensor_readings?.[0] || station?.latest_sensor_reading || null;
const PH_TIME_ZONE = 'Asia/Manila';
const formatPhilippineTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : `${date.toLocaleString('en-PH', { timeZone: PH_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })} PST (UTC+8)`;
};
const evaluateDrainageCondition = (reading, station) => {
  if (!reading || reading.water_level_cm == null) {
    return { code: 'unknown', label: 'Awaiting data', flowRateLpm: null };
  }
  const waterLevel = Number(reading.water_level_cm);
  const threshold = Number(station?.warning_threshold_cm || 60);
  if (waterLevel < threshold) return { code: 'normal', label: 'Clear / Safe', flowRateLpm: reading.flow_rate == null ? null : Number(reading.flow_rate) };
  if (reading.flow_rate == null) return { code: 'unknown', label: 'Awaiting flow data', flowRateLpm: null };
  const flowRateLpm = Number(reading.flow_rate);
  if (waterLevel >= threshold && flowRateLpm < 1.0) return { code: 'blockage_detected', label: 'Blockage Detected', flowRateLpm };
  if (waterLevel >= threshold && flowRateLpm >= 1.0) return { code: 'elevated_water', label: 'Elevated Water', flowRateLpm };
  return { code: 'normal', label: 'Clear / Safe', flowRateLpm };
};
const conditionTone = (code) => code === 'blockage_detected' ? 'critical' : code === 'elevated_water' ? 'warning' : code === 'normal' ? 'normal' : 'unknown';

function SectionHeading({ kicker, title, description, aside }) {
  return <div className="section-heading-row"><div><p className="section-kicker">{kicker}</p><h2>{title}</h2>{description && <p className="section-description">{description}</p>}</div>{aside}</div>;
}

function RecordStatus({ status }) {
  const value = String(status || 'normal');
  const tone = /block|critical/i.test(value) ? 'critical' : /warning|watch|alert|elevated/i.test(value) ? 'warning' : 'normal';
  return <span className={`record-status ${tone}`}><i/>{status || 'Normal'}</span>;
}

const normalizedReportStatus = (status) => status === 'submitted' ? 'pending' : status || 'pending';
const reportStatusLabel = (status) => ({ pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' })[normalizedReportStatus(status)] || status;

function RecordsTable({ records, loading, error, station }) {
  return <section className="records-section">
    <SectionHeading kicker="MONITORING HISTORY" title="Recent Sensor Records" description="Recorded sensor measurements from the drainage network." aside={<span className="records-count"><Database size={14}/>{records.length} records</span>}/>
    <div className="records-container">
      {loading && records.length === 0 ? <div className="records-state"><span className="loader"/><strong>Loading sensor history</strong><p>Fetching saved readings for {station?.station_code || 'the selected station'}.</p></div>
        : error && records.length === 0 ? <div className="records-state"><span className="records-state-icon"><Database size={19}/></span><strong>History is unavailable</strong><p>{error}</p></div>
          : records.length === 0 ? <div className="records-state"><span className="records-state-icon"><Clock3 size={19}/></span><strong>No readings for this station yet</strong><p>Historical sensor readings from {station?.station_code || 'this station'} will appear here after the node reports data.</p></div>
            : <div className="table-scroll"><table className="records-table"><thead><tr><th>DATE &amp; TIME</th><th>WATER LEVEL</th><th>FLOW RATE</th><th>STATUS</th></tr></thead><tbody>{records.map((record, index) => {
              const at = record.recorded_at || record.created_at || record.timestamp;
              const condition = evaluateDrainageCondition(record, record.station || station);
              return <tr key={record.id || `${at}-${index}`}><td><span className="record-date">{formatPhilippineTime(at)}</span>{record.station?.station_code && <small>{record.station.station_code}</small>}</td><td>{formatValue(record.water_level_cm)} <small>cm</small></td><td>{formatValue(record.flow_rate, 2)} <small>L/min</small></td><td><RecordStatus status={condition.label}/></td></tr>;
            })}</tbody></table></div>}
    </div>
  </section>;
}

function FieldReportForm({ role, stations, selectedStationId, onStationChange, onSubmitted }) {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const stationId = selectedStationId || '';
  const roleDescription = role === 'admin'
    ? 'As an Admin, submit a field report to flag localized drainage issues for review and coordination.'
    : 'As a Viewer, share a local drainage observation to help municipal teams verify conditions in the field.';

  const submitReport = async (event) => {
    event.preventDefault();
    if (!stationId || !subject.trim() || details.trim().length < 10) {
      setFeedback({ type: 'error', message: !stationId ? 'Select a drainage station for this report.' : 'Enter a subject and at least 10 characters of observation details.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const { data } = await api.post('/v1/reports', { station_id: Number(stationId), subject: subject.trim(), message: details.trim() }, { timeout: 20000 });
      setFeedback({ type: 'success', message: data.message || 'Your field report has been submitted.' });
      setSubject('');
      setDetails('');
      await onSubmitted?.();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFeedback({ type: 'error', message: errors ? Object.values(errors).flat().join(' ') : err.response?.data?.message || 'We could not submit the report. Please try again.' });
    } finally { setBusy(false); }
  };

  return <section className="report-section">
    <div className="report-intro"><p className="section-kicker">FIELD OPERATIONS</p><h2>Report a field issue</h2><p>{roleDescription}</p><div className="report-role-note"><MapPin size={15}/><span>Choose the station node where you observed the issue.</span></div></div>
    <form className="report-form" onSubmit={submitReport}>
      <label htmlFor="report-station">Drainage station</label><select id="report-station" value={stationId} onChange={(event) => onStationChange(event.target.value || null)} required disabled={!stations.length}><option value="">{stations.length ? 'Select a station' : 'No stations available'}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.station_code} / {station.location_name}</option>)}</select>
      <label htmlFor="issue-subject">Issue subject</label><input id="issue-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} placeholder="Debris buildup near roadside drain" required/>
      <label htmlFor="observation-details">Observation details</label><textarea id="observation-details" value={details} onChange={(event) => setDetails(event.target.value)} minLength={10} maxLength={5000} rows={4} placeholder="Describe what you observed and where it is located..." required/>
      {feedback && <p className={`report-feedback ${feedback.type}`} role="status">{feedback.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}<span>{feedback.message}</span></p>}
      <button className="report-submit" type="submit" disabled={busy || !stations.length} aria-busy={busy}><Send size={15} className={busy ? 'spin' : ''}/>{busy ? 'Submitting report...' : 'Submit Field Report'}</button>
    </form>
  </section>;
}

function ReportsList({ reports, loading, error, isAdmin, onStatusUpdate }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [statusError, setStatusError] = useState('');
  const handleStatusChange = async (reportId, status) => {
    setUpdatingId(reportId);
    setStatusError('');
    const result = await onStatusUpdate(reportId, status);
    if (!result.ok) setStatusError(result.message);
    setUpdatingId(null);
  };
  return <section className="reports-list-panel"><div className="reports-list-heading"><div><span className="section-kicker">SUBMISSIONS</span><h3>Recent field reports</h3></div><span className="records-count">{reports.length} reports</span></div>
    {statusError && <p className="report-feedback error" role="alert"><AlertTriangle size={15}/>{statusError}</p>}
    {loading && reports.length === 0 ? <div className="records-state"><span className="loader"/><p>Loading reports...</p></div>
      : error && reports.length === 0 ? <div className="records-state"><strong>Reports unavailable</strong><p>{error}</p></div>
        : reports.length === 0 ? <div className="records-state"><span className="records-state-icon"><Clock4 size={18}/></span><strong>No reports submitted</strong><p>New field reports will appear here after submission.</p></div>
          : <div className="report-list">{reports.map((report) => <article className="report-list-item" key={report.id}><span className="report-status-mark"><AlertTriangle size={15}/></span><div className="report-list-main"><strong>{report.subject}</strong><p>{report.message}</p><small>{report.station ? `${report.station.station_code} / ${report.station.location_name} · ` : 'Station removed · '}{report.user?.name || 'Field user'} / {formatPhilippineTime(report.created_at)}</small></div>{isAdmin ? <label className="report-status-control"><span className="sr-only">Update report status</span><select aria-label={`Update status for ${report.subject}`} value={normalizedReportStatus(report.status)} disabled={updatingId === report.id} onChange={(event) => handleStatusChange(report.id, event.target.value)}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></label> : <span className={`report-list-status ${normalizedReportStatus(report.status)}`}>{reportStatusLabel(report.status)}</span>}</article>)}</div>}
  </section>;
}

function StationCard({ station, stationId }) {
  const reading = readingFor(station);
  const water = reading?.water_level_cm;
  const threshold = Number(station.warning_threshold_cm || 60);
  const condition = evaluateDrainageCondition(reading, station);
  const tone = conditionTone(condition.code);
  const active = station.status === 'active';
  const syncedAt = reading?.recorded_at || reading?.created_at || reading?.timestamp;
  return <article className="station-card" id={stationId}>
    <div className="station-heading"><div className="station-title"><span className="station-code">{station.station_code || 'UNASSIGNED'}</span><h2>{station.location_name || 'Unnamed location'}</h2><p className="location-line"><MapPin size={14}/>{station.latitude}, {station.longitude}</p></div><span className={`status-pill ${active ? 'online' : station.status === 'maintenance' ? 'maintenance' : 'offline'}`}><i/>{station.status || 'offline'}</span></div>
    <div className="metrics-grid"><div className={`metric-tile water-${tone}`}><div className="metric-label"><Droplet size={16}/>Water level</div><div className="metric-value">{formatValue(water)} <small>cm</small></div><div className="level-track"><span style={{ width: `${Math.min(100, Math.max(0, Number(water) || 0))}%` }}/></div><div className="metric-hint">Warning at {formatValue(threshold, 0)} cm</div></div><div className="metric-tile flow-tile"><div className="metric-label"><Waves size={16}/>Flow rate</div><div className="metric-value">{formatValue(condition.flowRateLpm, 1)} <small>L/min</small></div><div className="metric-hint">Live sensor reading</div></div><div className={`blockage-tile ${tone}`}><span className="blockage-icon">{tone === 'critical' ? <ShieldAlert size={17}/> : tone === 'unknown' ? <CircleHelp size={17}/> : <Check size={17}/>}</span><span><small>Drainage condition</small><strong>{condition.label}</strong></span></div></div>
    <footer className="station-footer"><span><BatteryCharging size={15}/>{formatValue(reading?.battery_voltage, 2)} V</span><span className="sync-time">Last sync / {syncedAt ? formatPhilippineTime(syncedAt) : 'No readings yet'}</span></footer>
  </article>;
}

const blankStation = { station_code: '', location_name: '', latitude: CENTER.latitude, longitude: CENTER.longitude, status: 'active', warning_threshold_cm: 60 };

function StationManagement({ stations, onSaved }) {
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(blankStation);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const editing = Boolean(selectedId);

  const chooseStation = (event) => {
    const value = event.target.value;
    setSelectedId(value);
    const selected = stations.find((station) => String(station.id) === value);
    setForm(selected ? {
      station_code: selected.station_code || '',
      location_name: selected.location_name || '',
      latitude: selected.latitude ?? CENTER.latitude,
      longitude: selected.longitude ?? CENTER.longitude,
      status: selected.status || 'active',
      warning_threshold_cm: selected.warning_threshold_cm ?? 60,
    } : blankStation);
    setFeedback(null);
  };

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const saveStation = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      warning_threshold_cm: Number(form.warning_threshold_cm),
    };
    try {
      const response = editing
        ? await api.patch(`/v1/admin/stations/${selectedId}`, payload)
        : await api.post('/v1/admin/stations', payload);
      setFeedback({ type: 'success', message: response.data.message || 'Station settings saved.' });
      await onSaved();
      if (!editing) { setSelectedId(''); setForm(blankStation); }
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFeedback({ type: 'error', message: errors ? Object.values(errors).flat().join(' ') : err.response?.data?.message || 'Unable to save station settings.' });
    } finally { setBusy(false); }
  };

  const deleteStation = async () => {
    const station = stations.find((item) => String(item.id) === String(selectedId));
    if (!station || !window.confirm(`Delete ${station.station_code}? Its sensor readings, alerts, and linked field reports will also be permanently removed.`)) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const { data } = await api.delete(`/v1/admin/stations/${selectedId}`);
      setSelectedId('');
      setForm(blankStation);
      setFeedback({ type: 'success', message: data.message || 'Station deleted.' });
      await onSaved();
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Unable to delete this station.' });
    } finally { setDeleting(false); }
  };

  return <section className="station-management"><div className="station-management-heading"><div><span className="section-kicker">ADMINISTRATION</span><h3>Manage stations</h3><p>Add or edit nodes, locations, operating state, and water warning limits.</p></div><label className="station-select-label">Edit existing node<select value={selectedId} onChange={chooseStation}><option value="">Add a new station</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.station_code} / {station.location_name}</option>)}</select></label></div>
    <form className="station-admin-form" onSubmit={saveStation}>
      <label>Station code<input name="station_code" value={form.station_code} onChange={updateField} maxLength={32} placeholder="CAL-DRN-02" required/></label>
      <label>Location name<input name="location_name" value={form.location_name} onChange={updateField} maxLength={255} placeholder="Drainage location" required/></label>
      <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" value={form.latitude} onChange={updateField} required/></label>
      <label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" value={form.longitude} onChange={updateField} required/></label>
      <label>Node state<select name="status" value={form.status} onChange={updateField}><option value="active">Online</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></label>
      <label>Warning threshold (cm)<input name="warning_threshold_cm" type="number" min="1" max="10000" step="0.1" value={form.warning_threshold_cm} onChange={updateField} required/></label>
      {feedback && <p className={`report-feedback ${feedback.type}`} role="status">{feedback.type === 'success' ? <CheckCircle2 size={15}/> : <AlertTriangle size={15}/>}<span>{feedback.message}</span></p>}
      <div className="station-form-actions"><button type="submit" className="report-submit" disabled={busy || deleting}>{busy ? 'Saving...' : editing ? 'Save station changes' : 'Add station'}</button>{editing && <><button type="button" className="secondary-action" onClick={() => chooseStation({ target: { value: '' } })}>Cancel edit</button><button type="button" className="delete-station-button" onClick={deleteStation} disabled={busy || deleting}>{deleting ? 'Deleting...' : 'Delete Station'}</button></>}</div>
    </form>
  </section>;
}

function TelemetryCards({ station }) {
  const reading = station ? readingFor(station) : null;
  const current = reading || {};
  const water = Number(current.water_level_cm) || 0;
  const condition = evaluateDrainageCondition(reading, station);
  const tone = conditionTone(condition.code);
  const hasHighWater = condition.code === 'blockage_detected' || condition.code === 'elevated_water';
  const isBlocked = condition.code === 'blockage_detected';
  const flowPerMinute = condition.flowRateLpm;
  return <><SectionHeading kicker="SYSTEM MONITORING" title="Live Drainage Status" description={station ? `${station.station_code} / ${station.location_name}` : 'Select a station to view its latest readings.'} aside={<span className={`live-badge ${reading ? 'is-live' : ''}`}><i/>{reading ? 'LIVE DATA' : 'NO DATA'}</span>}/>
    <div className="live-grid">
      <article className="live-card"><div className="live-card-top"><span className="live-icon cyan"><Droplet size={18}/></span><span className={`condition-badge ${tone}`}>{tone === 'unknown' ? 'NO DATA' : hasHighWater ? 'WARNING' : 'NORMAL'}</span></div><p className="live-card-label">Water Level</p><div className="live-reading">{formatValue(current.water_level_cm)}<small> cm</small></div><div className="water-progress"><span style={{ width: `${Math.min(100, Math.max(0, water))}%` }}/></div><div className="live-card-foot"><span>0 cm</span><span>100 cm scale</span></div></article>
      <article className="live-card"><div className="live-card-top"><span className="live-icon blue"><Waves size={18}/></span><span className={`condition-badge ${tone === 'unknown' ? 'unknown' : flowPerMinute >= 1 ? 'normal' : 'warning'}`}>{tone === 'unknown' ? 'NO DATA' : flowPerMinute >= 1 ? 'FLOWING' : 'LOW FLOW'}</span></div><p className="live-card-label">Water Flow</p><div className="live-reading">{formatValue(flowPerMinute)}<small> L/min</small></div>{reading ? <div className="equalizer" aria-label="Flow visualization">{[34,58,76,47,90,64,38,70,50,82,44,63].map((height, index) => <i key={index} style={{ '--bar-height': `${height}%`, '--bar-delay': `${index * 65}ms` }}/>)}</div> : <p className="live-card-note">A flow reading will appear after this station reports data.</p>}<div className="live-card-foot"><span>Flow rate</span><span>Latest station reading</span></div></article>
      <article className="live-card"><div className="live-card-top"><span className={`live-icon ${tone === 'critical' ? 'rose' : tone === 'warning' ? 'amber' : 'green'}`}>{tone === 'critical' ? <AlertTriangle size={18}/> : tone === 'unknown' ? <CircleHelp size={18}/> : <Check size={18}/>}</span><span className={`condition-badge ${tone}`}>{tone === 'critical' ? 'CRITICAL' : tone === 'warning' ? 'WARNING' : tone === 'unknown' ? 'NO DATA' : 'CLEAR'}</span></div><p className="live-card-label">Drainage Status</p><div className={`status-reading ${tone === 'critical' ? 'is-critical' : tone === 'warning' ? 'is-warning' : ''}`}>{tone === 'critical' ? <AlertTriangle size={23}/> : tone === 'warning' ? <ArrowUp size={25}/> : tone === 'unknown' ? <CircleHelp size={22}/> : <Check size={24}/>}<strong>{condition.label}</strong></div><p className="live-card-note">{station?.location_name || 'Select a station'}</p></article>
      <article className="live-card"><div className="live-card-top"><span className={`live-icon ${isBlocked ? 'rose' : 'green'}`}><ShieldAlert size={18}/></span><span className={`condition-badge ${isBlocked ? 'critical' : tone === 'unknown' ? 'unknown' : 'normal'}`}>{isBlocked ? 'DETECTED' : tone === 'unknown' ? 'NO DATA' : 'SAFE'}</span></div><p className="live-card-label">Blockage Detection</p><div className={`status-reading ${isBlocked ? 'is-critical' : ''}`}><span className={`safe-indicator ${isBlocked ? 'unsafe' : ''}`}/><strong>{tone === 'unknown' ? 'Awaiting data' : isBlocked ? 'Blockage Detected' : 'Not Detected'}</strong></div><p className="live-card-note">Based on water depth and flow rate</p></article>
    </div>
  </>;
}

function MapStationFocus({ station }) {
  const map = useMap();
  const latitude = Number(station?.latitude);
  const longitude = Number(station?.longitude);
  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), { duration: 0.55 });
  }, [map, latitude, longitude]);
  return null;
}

function StationMap({ stations, selectedStation, onOpenStation }) {
  const createNodeIcon = (status, conditionCode) => {
    const conditionClass = status === 'offline' ? 'offline' : status === 'maintenance' ? 'attention' : conditionCode === 'blockage_detected' ? 'critical' : conditionCode === 'elevated_water' ? 'attention' : 'online';
    return L.divIcon({
    className: 'leaflet-node-wrap',
    html: `<span class="leaflet-node ${conditionClass}"><i></i></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    });
  };

  return <section className="map-view">
    <SectionHeading kicker="FIELD NETWORK / CALAUAN, LAGUNA" title="Drainage station map" description="Pan or zoom the map. Select a station marker to view current sensor readings." aside={<span className="map-center-chip"><LocateFixed size={14}/>{CENTER.latitude} N / {CENTER.longitude} E</span>}/>
    <div className="station-map-frame"><div className="map-toolbar"><span><i className="map-toolbar-dot"/>LIVE STATION LOCATIONS</span><span className="map-scale">OPENSTREETMAP / DARK DISPLAY</span></div>
      <MapContainer className="leaflet-station-map" center={[CENTER.latitude, CENTER.longitude]} zoom={14} scrollWheelZoom zoomControl attributionControl>
        <MapStationFocus station={selectedStation}/>
        <TileLayer className="dark-osm-tiles" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" subdomains="abc" maxZoom={19}/>
        {stations.map((station, index) => {
          const latitude = Number(station.latitude) || CENTER.latitude;
          const longitude = Number(station.longitude) || CENTER.longitude;
          const reading = readingFor(station);
          const condition = evaluateDrainageCondition(reading, station);
          return <Marker key={station.id || station.station_code || index} position={[latitude, longitude]} icon={createNodeIcon(station.status, condition.code)}>
            <Popup className="station-leaflet-popup"><div className="leaflet-popup-content"><span className={`leaflet-status ${station.status === 'active' ? 'up' : station.status === 'maintenance' ? 'maintenance' : 'down'}`}><i/>{station.status || 'offline'}</span><strong>{station.station_code || 'Station node'}</strong><p>{station.location_name || 'Calauan, Laguna'}</p><span className={`leaflet-condition ${conditionTone(condition.code)}`}>{condition.label}</span><div className="leaflet-popup-metrics"><span><small>WATER DEPTH</small><b>{formatValue(reading?.water_level_cm)} cm</b></span><span><small>FLOW RATE</small><b>{formatValue(reading?.flow_rate, 2)} L/min</b></span></div><button type="button" onClick={() => onOpenStation(station)}>Open sensor readings <ChevronRight size={14}/></button></div></Popup>
          </Marker>;
        })}
      </MapContainer>
      <div className="map-legend"><span><i className="legend-online"/>Normal</span><span><i className="legend-alert"/>Elevated</span><span><i className="legend-critical"/>Blockage</span></div>
      {!stations.length && <div className="map-empty-state"><strong>No station nodes registered</strong><span>Admin users can add drainage stations below.</span></div>}
    </div><footer className="map-footer"><span><MapPin size={13}/>Calauan municipal monitoring area</span><span>{stations.length} station nodes</span></footer>
  </section>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(Boolean(localStorage.getItem('auth_token')));
  const [authView, setAuthView] = useState('login');
  const [dashboardData, setDashboardData] = useState(null);
  const [records, setRecords] = useState([]);
  const [fieldReports, setFieldReports] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkLive, setNetworkLive] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState(null);

  const acceptLogin = (newUser) => {
    setUser(newUser || null);
    if (newUser) localStorage.setItem('auth_user', JSON.stringify(newUser));
    setToken(localStorage.getItem('auth_token'));
  };

  const logout = useCallback(async () => {
    try { if (localStorage.getItem('auth_token')) await api.post('/v1/logout'); } catch { /* Clear local session even when offline. */ }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('user_role');
    setToken(null); setUser(null); setDashboardData(null); setRecords([]); setFieldReports([]); setError(''); setRecordsError(''); setReportsError('');
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;
    setLoading(true);
    try {
      const { data } = await api.get('/v1/dashboard');
      const loadedStations = data.stations || data.data?.stations || [];
      setSelectedStationId((current) => current && loadedStations.some((station) => String(station.id) === String(current))
        ? current
        : loadedStations[0] ? String(loadedStations[0].id) : null);
      setDashboardData(data);
      setNetworkLive(true);
      setError('');
    } catch (err) {
      setNetworkLive(false);
      if (err.response?.status === 401) { logout(); return; }
      setError(err.response?.data?.message || 'Unable to load live sensor readings. Check the connection and try again.');
    } finally { setLoading(false); }
  }, [logout]);

  const fetchRecords = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;
    setRecordsLoading(true);
    try {
      const { data } = await api.get('/v1/records', { params: selectedStationId ? { station_id: selectedStationId } : {} });
      const rows = Array.isArray(data) ? data : data.records || data.data?.records || data.data || [];
      setRecords(Array.isArray(rows) ? rows : []);
      setRecordsError('');
    } catch (err) {
      if (err.response?.status === 401) { logout(); return; }
      setRecordsError(err.response?.data?.message || 'The records endpoint is not available right now.');
    } finally { setRecordsLoading(false); }
  }, [logout, selectedStationId]);

  const fetchFieldReports = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;
    setReportsLoading(true);
    try {
      const { data } = await api.get('/v1/reports');
      const rows = Array.isArray(data) ? data : data.reports || data.data?.reports || [];
      setFieldReports(Array.isArray(rows) ? rows : []);
      setReportsError('');
    } catch (err) {
      if (err.response?.status === 401) { logout(); return; }
      setReportsError(err.response?.data?.message || 'Unable to load field reports.');
    } finally { setReportsLoading(false); }
  }, [logout]);

  const updateReportStatus = useCallback(async (reportId, status) => {
    try {
      const { data } = await api.patch(`/v1/admin/reports/${reportId}/status`, { status });
      setFieldReports((current) => current.map((report) => report.id === reportId ? data.report : report));
      return { ok: true };
    } catch (err) {
      if (err.response?.status === 401) logout();
      return { ok: false, message: err.response?.data?.message || 'The report status could not be updated.' };
    }
  }, [logout]);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    const initialize = window.setTimeout(async () => {
      setUserLoading(true);
      try {
        const { data: currentUser } = await api.get('/user');
        if (!active) return;
        setUser(currentUser);
        localStorage.setItem('auth_user', JSON.stringify(currentUser));
        if (currentUser.role) localStorage.setItem('user_role', currentUser.role);
        fetchDashboard();
      } catch (err) {
        if (err.response?.status === 401) logout();
      } finally { if (active) setUserLoading(false); }
    }, 0);
    const dashboardTimer = window.setInterval(fetchDashboard, 30000);
    return () => { active = false; window.clearTimeout(initialize); window.clearInterval(dashboardTimer); };
  }, [token, fetchDashboard, logout]);

  useEffect(() => {
    if (!token) return undefined;
    const initialFetch = window.setTimeout(fetchRecords, 0);
    const recordsTimer = window.setInterval(fetchRecords, 60000);
    return () => { window.clearTimeout(initialFetch); window.clearInterval(recordsTimer); };
  }, [token, fetchRecords]);

  useEffect(() => {
    if (!token || activeTab !== 'reports') return undefined;
    const timer = window.setTimeout(fetchFieldReports, 0);
    return () => window.clearTimeout(timer);
  }, [token, activeTab, fetchFieldReports]);

  const stationsForSelection = dashboardData?.stations || dashboardData?.data?.stations || EMPTY_STATIONS;

  if (!token) return authView === 'login'
    ? <Login onLoginSuccess={acceptLogin} onSwitchToRegister={() => setAuthView('register')}/>
    : <Register onRegisterSuccess={acceptLogin} onSwitchToLogin={() => setAuthView('login')}/>;

  const stations = stationsForSelection;
  const isAdmin = user?.role === 'admin';
  const role = isAdmin ? 'admin' : 'viewer';
  const onlineStations = stations.filter((station) => station.status === 'active').length;
  const attentionStations = stations.filter((station) => station.status !== 'active' || ['blockage_detected', 'elevated_water'].includes(evaluateDrainageCondition(readingFor(station), station).code)).length;
  const selectedStation = stations.find((station) => String(station.id) === String(selectedStationId)) || stations[0];
  const selectTab = (tabId) => { setActiveTab(tabId); setMobileMenuOpen(false); };
  const openStationTelemetry = (station) => {
    setSelectedStationId(String(station.id));
    setActiveTab('telemetry');
    setMobileMenuOpen(false);
    window.setTimeout(() => document.getElementById(`station-detail-${station.id || station.station_code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  return <div className="dashboard-shell">
    <header className="topbar">
      <a className="brand" href="#dashboard" aria-label="AGOSENSE dashboard"><span className="brand-mark">{'\u2248'}</span><span><strong>AGOSENSE</strong><small>DRAINAGE INTELLIGENCE</small></span></a>
      <nav className={`tab-navigation ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Dashboard sections">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`tab-button ${activeTab === id ? 'active' : ''}`} onClick={() => selectTab(id)} aria-current={activeTab === id ? 'page' : undefined}><Icon size={15}/><span>{label}</span></button>)}<div className="mobile-drawer-footer"><span className={`network-state ${networkLive ? 'online' : 'offline'}`}><i/>{networkLive ? 'Network live' : 'Network offline'}</span><span className={`role-badge ${userLoading ? 'pending' : isAdmin ? 'admin' : 'viewer'}`}>{isAdmin ? <Cog size={13}/> : <ShieldAlert size={13}/>}<span>{userLoading ? 'Checking role' : isAdmin ? 'Admin' : 'Viewer'}</span></span><button className="logout-button" onClick={logout}><LogOut size={16}/><span>Sign out</span></button></div></nav>
      <div className="topbar-right"><label className="global-station-switcher"><MapPin size={14}/><span className="sr-only">Select station</span><select value={selectedStation?.id || ''} onChange={(event) => setSelectedStationId(event.target.value || null)} disabled={!stations.length} aria-label="Select monitored station"><option value="">{stations.length ? 'Select station' : 'No stations'}</option>{stations.map((station) => <option key={station.id} value={station.id}>{station.station_code}</option>)}</select></label><span className={`network-state ${networkLive ? 'online' : 'offline'}`}><i/>{networkLive ? 'Network live' : 'Network offline'}</span><span className={`role-badge ${userLoading ? 'pending' : isAdmin ? 'admin' : 'viewer'}`}>{isAdmin ? <Cog size={13}/> : <ShieldAlert size={13}/>}<span>{userLoading ? 'Checking role' : isAdmin ? 'Admin' : 'Viewer'}</span></span><button className="logout-button" onClick={logout}><LogOut size={16}/><span>Sign out</span></button><button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={19}/> : <Menu size={19}/>}</button></div>
    </header>
    <main className="dashboard-main" id="dashboard">
      {error && <div className="alert-banner" role="alert"><AlertTriangle size={18}/><span>{error}</span><button onClick={fetchDashboard}>Retry</button></div>}

      {activeTab === 'overview' && <section className="tab-page overview-page">
        <div className="page-intro"><div><p className="eyebrow location-tag"><MapPin size={13}/> CALAUAN, LAGUNA</p><h1>Drainage overview</h1><p className="intro-copy">{userLoading ? 'Loading access profile...' : isAdmin ? 'Admin Portal: Full station control' : 'Resident Portal: Live municipal monitoring view'}</p></div><div className="intro-actions">{isAdmin && <button className="manage-stations-button" type="button" onClick={() => selectTab('map')}><Cog size={15}/>Manage Stations</button>}<button className="refresh-button" onClick={() => { fetchDashboard(); fetchRecords(); }} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Refreshing live data' : 'Refresh live data'}</button></div></div>
        <div className="summary-row"><div><span className="summary-label">Monitored stations</span><strong>{stations.length.toString().padStart(2, '0')}</strong></div><div><span className="summary-label">Online</span><strong className="text-emerald">{onlineStations.toString().padStart(2, '0')}</strong></div><div><span className="summary-label">Attention required</span><strong className="text-amber">{attentionStations.toString().padStart(2, '0')}</strong></div><div className="summary-updated"><span className="summary-label">Access level</span><strong>{userLoading ? 'Checking role' : isAdmin ? 'Admin / full control' : 'Viewer / live view'}</strong><small>Auto refresh / 30 sec</small></div></div>
        <div className="overview-grid"><section className="overview-panel"><div className="panel-heading"><div><span className="panel-kicker">FIELD NETWORK</span><h2>Station status</h2></div><button className="text-action" onClick={() => selectTab('telemetry')}>Live sensor readings <ChevronRight size={14}/></button></div>{stations.length ? <div className="overview-station-list">{stations.slice(0, 6).map((station, index) => <button className="overview-station-row" key={station.id || station.station_code || index} onClick={() => openStationTelemetry(station)}><span className={`station-health ${station.status === 'active' ? 'healthy' : station.status === 'maintenance' ? 'attention' : 'offline'}`}/><span className="overview-node-code">{station.station_code || 'UNASSIGNED'}</span><span className="overview-node-name">{station.location_name || 'Unnamed station'}</span><span className="overview-node-level">{formatValue(readingFor(station)?.water_level_cm)} <small>cm</small></span><ChevronRight size={14}/></button>)}</div> : <div className="inventory-empty">{loading ? 'Loading station nodes...' : 'No stations are currently available.'}</div>}</section>
          <section className="overview-panel network-panel"><div className="panel-heading"><div><span className="panel-kicker">SYSTEM HEALTH</span><h2>Operations summary</h2></div><span className={`system-state ${networkLive ? 'up' : 'down'}`}><i/>{networkLive ? 'OPERATIONAL' : 'CHECK LINK'}</span></div><div className="operation-metric"><span><Activity size={15}/>API connection</span><strong>{networkLive ? 'Connected' : 'Awaiting response'}</strong></div><div className="operation-metric"><span><Gauge size={15}/>Field stations</span><strong>{onlineStations} / {stations.length} online</strong></div><div className="operation-metric"><span><Clock3 size={15}/>Refresh cadence</span><strong>30 seconds</strong></div><button className="map-shortcut" onClick={() => selectTab('map')}><MapPin size={15}/>Open station map<ChevronRight size={14}/></button></section></div>
      </section>}

      {activeTab === 'telemetry' && <section className="tab-page telemetry-page">{loading && !dashboardData ? <div className="loading-panel compact-loader"><span className="loader"/><p>Refreshing live data...</p></div> : <TelemetryCards station={selectedStation}/>}<div className="station-details"><div className="station-details-label"><PanelsTopLeft size={15}/><span>Station inventory</span><small>{stations.length} registered</small></div>{stations.length ? <div className="station-grid">{stations.map((station, index) => <StationCard key={station.id || station.station_code || index} station={station} stationId={`station-detail-${station.id || station.station_code || index}`}/>)}</div> : <div className="inventory-empty">No stations are currently available. Stations will appear after they are registered with the monitoring service.</div>}</div></section>}
      {activeTab === 'map' && <section className="tab-page"><StationMap stations={stations} selectedStation={selectedStation} onOpenStation={openStationTelemetry}/>{isAdmin && <StationManagement stations={stations} onSaved={fetchDashboard}/>}</section>}
      {activeTab === 'reports' && <section className="tab-page reports-page"><div className="page-intro compact-intro"><div><p className="eyebrow">FIELD OPERATIONS</p><h1>Field reports</h1><p className="intro-copy">Submit a local observation and review reports available to your account.</p></div><span className="role-context">{isAdmin ? 'ADMIN VIEW / ALL SUBMISSIONS' : 'VIEWER / YOUR SUBMISSIONS'}</span></div><FieldReportForm role={role} stations={stations} selectedStationId={selectedStation?.id ? String(selectedStation.id) : ''} onStationChange={setSelectedStationId} onSubmitted={fetchFieldReports}/><ReportsList reports={fieldReports} loading={reportsLoading} error={reportsError} isAdmin={isAdmin} onStatusUpdate={updateReportStatus}/></section>}
      {activeTab === 'history' && <section className="tab-page history-page"><RecordsTable records={records} loading={recordsLoading} error={recordsError} station={selectedStation}/></section>}

      <footer className="page-footer"><span><Activity size={14}/>AGOSENSE / municipal drainage operations</span><span>Live sensor readings refresh every 30 seconds</span></footer>
    </main>
  </div>;
}

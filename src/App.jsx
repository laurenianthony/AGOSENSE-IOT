import { Component, useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUp, BatteryCharging, Check, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, Clock4, Cog, Database, Droplet,
  FileDown, Gauge, LogOut, MapPin, PanelsTopLeft, RefreshCw, Send, ShieldAlert,
  Waves, LocateFixed, Sun, Moon, Settings, SlidersHorizontal, KeyRound, Eye, EyeOff, Menu, X, UserCheck,
} from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from './api/axios';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Brand from './components/Brand';
import Sidebar from './components/Sidebar';
import PendingUsersList from './components/PendingUsersList';
import { STRONG_PASSWORD_HTML_PATTERN, STRONG_PASSWORD_MESSAGE, STRONG_PASSWORD_PATTERN } from './utils/passwordPolicy';

const CENTER = { latitude: 14.1417, longitude: 121.3167 };
const EMPTY_STATIONS = [];
const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};
const sortStations = (stations = []) => [...stations].sort((a, b) => {
  const codeA = String(a.station_code || a.code || a.location_name || a.name || a.id || '');
  const codeB = String(b.station_code || b.code || b.location_name || b.name || b.id || '');
  return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
});
const tabs = [
  { id: 'overview', label: 'Overview', icon: PanelsTopLeft },
  { id: 'telemetry', label: 'Live Sensor Readings', icon: Activity },
  { id: 'map', label: 'Station Map', icon: MapPin },
  { id: 'reports', label: 'Field Reports', icon: AlertTriangle },
  { id: 'history', label: 'Historical Records', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const approvalTab = { id: 'approvals', label: 'Pending approvals', icon: UserCheck };

const formatValue = (value, digits = 1) => value == null || value === ''
  ? '--'
  : Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : value;
const readingFor = (station) => station?.latest_reading || station?.latestReading || station?.sensor_readings?.[0] || station?.latest_sensor_reading || null;
const stationConnectivityStatus = (station) => {
  if (station?.status === 'maintenance') return 'maintenance';
  return station?.status === 'active' ? 'online' : 'offline';
};
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

class DashboardErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <main className="app-crash-state" role="alert">
      <div><AlertTriangle size={24}/><h1>Dashboard could not be displayed</h1>
        <p>An unexpected display error occurred after sign-in. Reload the page to try again.</p>
        <details><summary>Display error details</summary><code>{this.state.error?.message || 'Unknown rendering error'}</code></details>
        <button type="button" onClick={() => window.location.reload()}>Reload dashboard</button>
      </div>
    </main>;
  }
}

function SectionHeading({ kicker, title, description, aside }) {
  return <div className="section-heading-row"><div><p className="section-kicker">{kicker}</p><h2>{title}</h2>{description && <p className="section-description">{description}</p>}</div>{aside}</div>;
}

function RecordStatus({ status }) {
  const value = String(status || 'normal');
  const tone = /block|critical/i.test(value) ? 'critical' : /warning|watch|alert|elevated/i.test(value) ? 'warning' : /await|unknown/i.test(value) ? 'unknown' : 'normal';
  return <span className={`record-status ${tone}`}><i/>{status || 'Normal'}</span>;
}

const normalizedReportStatus = (status) => status === 'submitted' ? 'pending' : status || 'pending';
const reportStatusLabel = (status) => ({ pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' })[normalizedReportStatus(status)] || status;

function SettingsPage({ theme, setTheme, stations, selectedStation, onThresholdSaved, isAdmin }) {
  const sortedStations = sortStations(stations);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [thresholdStationId, setThresholdStationId] = useState(selectedStation?.id ? String(selectedStation.id) : '');
  const thresholdStation = stations.find((station) => String(station.id) === String(thresholdStationId));
  const [threshold, setThreshold] = useState(String(thresholdStation?.warning_threshold_cm ?? 60));
  const [thresholdBusy, setThresholdBusy] = useState(false);
  const [thresholdFeedback, setThresholdFeedback] = useState(null);

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordFeedback(null);
    if (!STRONG_PASSWORD_PATTERN.test(newPassword)) {
      setPasswordFeedback({ type: 'error', text: STRONG_PASSWORD_MESSAGE });
      return;
    }
    if (newPassword !== passwordConfirmation) {
      setPasswordFeedback({ type: 'error', text: 'The new password and confirmation do not match.' });
      return;
    }
    setPasswordBusy(true);
    try {
      const { data } = await api.post('/v1/account/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: passwordConfirmation,
      });
      setPasswordFeedback({ type: 'success', text: data.message || 'Password updated successfully.' });
      setCurrentPassword(''); setNewPassword(''); setPasswordConfirmation('');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setPasswordFeedback({ type: 'error', text: errors ? Object.values(errors).flat().join(' ') : err.response?.data?.message || 'Unable to update your password.' });
    } finally { setPasswordBusy(false); }
  };

  const saveThreshold = async (event) => {
    event.preventDefault();
    if (!thresholdStationId) return;
    setThresholdBusy(true); setThresholdFeedback(null);
    try {
      const { data } = await api.patch(`/v1/admin/stations/${thresholdStationId}/threshold`, { warning_threshold_cm: Number(threshold) });
      setThresholdFeedback({ type: 'success', text: data.message || 'Alert threshold updated.' });
      onThresholdSaved?.();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setThresholdFeedback({ type: 'error', text: errors ? Object.values(errors).flat().join(' ') : err.response?.data?.message || 'Unable to update this station threshold.' });
    } finally { setThresholdBusy(false); }
  };

  const passwordField = (id, label, value, onChange, shown, setShown, autoComplete) => <label className="settings-field" htmlFor={id}>{label}<span className="settings-password-input"><input id={id} name={id} type={shown ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required minLength={id === 'settings-current-password' ? undefined : 8} pattern={id === 'settings-new-password' ? STRONG_PASSWORD_HTML_PATTERN : undefined} title={id === 'settings-new-password' ? STRONG_PASSWORD_MESSAGE : undefined}/><button type="button" className="reveal-button" aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onClick={() => setShown((visible) => !visible)}>{shown ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span>{id === 'settings-new-password' && <small className="password-policy-hint">{STRONG_PASSWORD_MESSAGE}</small>}</label>;

  return <section className="settings-page">
    <SectionHeading kicker="PREFERENCES & ACCOUNT" title="Settings" description="Manage account security and station alert limits."/>
    <div className="settings-grid">
      <section className="settings-panel settings-appearance"><div className="settings-panel-heading"><Sun size={20}/><span><strong>Appearance</strong><small>Choose a display that suits your working conditions.</small></span></div><button className="theme-setting-button" type="button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <><Sun size={17}/>Light mode</> : <><Moon size={17}/>Dark mode</>}<span>Change</span></button></section>
      <section className="settings-panel settings-password"><div className="settings-panel-heading"><KeyRound size={20}/><span><strong>Change password</strong><small>Confirm your current password before choosing a new one.</small></span></div><form className="settings-form" onSubmit={changePassword}>
        {passwordField('settings-current-password', 'Current password', currentPassword, setCurrentPassword, showCurrentPassword, setShowCurrentPassword, 'current-password')}
        {passwordField('settings-new-password', 'New password', newPassword, setNewPassword, showNewPassword, setShowNewPassword, 'new-password')}
        <label className="settings-field" htmlFor="settings-password-confirmation">Confirm new password<span className="settings-password-input"><input id="settings-password-confirmation" name="password_confirmation" type={showPasswordConfirmation ? 'text' : 'password'} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required/><button type="button" className="reveal-button" aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowPasswordConfirmation((visible) => !visible)}>{showPasswordConfirmation ? <EyeOff size={18}/> : <Eye size={18}/>}</button></span></label>
        {passwordFeedback && <p className={`settings-feedback ${passwordFeedback.type}`} role={passwordFeedback.type === 'error' ? 'alert' : 'status'}>{passwordFeedback.text}</p>}
        <button className="settings-primary-button" type="submit" disabled={passwordBusy}>{passwordBusy ? 'Updating password…' : 'Update password'}</button>
      </form></section>
      <section className="settings-panel settings-threshold"><div className="settings-panel-heading"><Gauge size={20}/><span><strong>Alert threshold</strong><small>Trigger elevated water alerts at this station’s configured depth.</small></span></div>{isAdmin ? <form className="settings-form" onSubmit={saveThreshold}>
        <label className="settings-field" htmlFor="settings-threshold-station">Station<select id="settings-threshold-station" name="station_id" value={thresholdStationId} onChange={(event) => { setThresholdStationId(event.target.value); const station = stations.find((item) => String(item.id) === event.target.value); setThreshold(String(station?.warning_threshold_cm ?? 60)); setThresholdFeedback(null); }} required><option value="" disabled>Select a station</option>{sortedStations.map((station) => <option key={station.id} value={station.id}>{station.station_code} · {station.location_name}</option>)}</select></label>
        <label className="settings-field" htmlFor="settings-threshold-cm">Water level limit (cm)<input id="settings-threshold-cm" name="warning_threshold_cm" type="number" min="1" max="10000" step="0.1" value={threshold} onChange={(event) => setThreshold(event.target.value)} required/><small>Current limit: {thresholdStation?.warning_threshold_cm ?? 60} cm. Blockage detection also checks low flow.</small></label>
        {thresholdFeedback && <p className={`settings-feedback ${thresholdFeedback.type}`} role={thresholdFeedback.type === 'error' ? 'alert' : 'status'}>{thresholdFeedback.text}</p>}
        <button className="settings-primary-button" type="submit" disabled={!thresholdStationId || thresholdBusy}>{thresholdBusy ? 'Saving threshold…' : 'Save alert threshold'}</button>
      </form> : <p className="settings-readonly">Threshold editing is available to administrators. Current selected station limit: <strong>{selectedStation?.warning_threshold_cm ?? 60} cm</strong>.</p>}</section>
    </div>
  </section>;
}

function RecordsTable({ stations, selectedStation }) {
  const sortedStations = sortStations(stations);
  const [stationId, setStationId] = useState(selectedStation?.id ? String(selectedStation.id) : '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const period = 'daily';
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: null, to: null });
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [settledRequest, setSettledRequest] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const tableViewport = useRef(null);
  const pageSize = 25;
  const requestKey = JSON.stringify({ stationId, dateFrom, dateTo, period, anomaliesOnly, page, pageSize });
  const loading = settledRequest !== requestKey;
  const rowHeight = 50;
  const viewportHeight = 500;
  const overscan = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(records.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  const visibleRecords = records.slice(startIndex, endIndex);
  const selectedStationRecord = stations.find((station) => String(station.id) === String(stationId));

  useEffect(() => {
    const controller = new AbortController();
    const query = JSON.parse(requestKey);
    const params = {
      station_id: query.stationId || undefined,
      date_from: query.dateFrom || undefined,
      date_to: query.dateTo || undefined,
      period: query.period,
      anomalies: query.anomaliesOnly ? 1 : undefined,
      page: query.page,
      per_page: query.pageSize,
    };
    api.get('/v1/records', { params, signal: controller.signal })
      .then(({ data }) => {
        setRecords(Array.isArray(data.records) ? data.records : []);
        setPagination(data.pagination || { current_page: 1, last_page: 1, total: 0, from: null, to: null });
        setScrollTop(0);
        if (tableViewport.current) tableViewport.current.scrollTop = 0;
        setError('');
        setSettledRequest(requestKey);
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED') return;
        setRecords([]);
        setPagination({ current_page: 1, last_page: 1, total: 0, from: null, to: null });
        setError(err.response?.data?.message || 'Sensor history could not be loaded. Please try again.');
        setSettledRequest(requestKey);
      });
    return () => controller.abort();
  }, [requestKey]);

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
    setScrollTop(0);
  };

  const exportRecords = async (format) => {
    setExporting(format);
    setError('');
    try {
      const { data } = await api.get('/v1/records/export', {
        params: {
          station_id: stationId || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          period,
          anomalies: anomaliesOnly ? 1 : undefined,
          format,
        },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agosense-${period}-records.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || `Could not export the ${format.toUpperCase()} file.`);
    } finally { setExporting(''); }
  };

  const historyTitle = 'Daily Sensor Summaries';

  return <section className="records-section">
    <SectionHeading kicker="MONITORING HISTORY" title={historyTitle} description="One compact daily summary per station, with average readings and status. Dates use Philippine Standard Time (UTC+8)." aside={<span className="records-count"><Database size={14}/>{pagination.total} days</span>}/>
    <button className="history-filter-toggle" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={17}/>{filtersOpen ? 'Hide filters' : 'Filters, dates & export'}<ChevronRight size={16}/></button>
    <div className={`history-toolbar ${filtersOpen ? 'is-open' : ''}`}>
      <label className="history-filter station-filter">Station<select id="history-station-filter" name="station_id" value={stationId} onChange={(event) => updateFilter(setStationId, event.target.value)}><option value="">All stations</option>{sortedStations.map((station) => <option key={station.id} value={station.id}>{station.station_code}</option>)}</select></label>
      <label className="history-filter">Date from<input id="history-date-from" name="date_from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => updateFilter(setDateFrom, event.target.value)}/></label>
      <label className="history-filter">Date to<input id="history-date-to" name="date_to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => updateFilter(setDateTo, event.target.value)}/></label>
      <label className="anomaly-filter"><input id="history-anomalies-only" name="anomalies_only" type="checkbox" checked={anomaliesOnly} onChange={(event) => updateFilter(setAnomaliesOnly, event.target.checked)}/><span>Show anomalies / blockages only</span></label>
      <div className="export-actions"><button type="button" onClick={() => exportRecords('csv')} disabled={Boolean(exporting)}><FileDown size={14}/>{exporting === 'csv' ? 'Preparing CSV…' : 'Export CSV'}</button><button type="button" onClick={() => exportRecords('pdf')} disabled={Boolean(exporting)}><FileDown size={14}/>{exporting === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}</button></div>
    </div>
    {error && <div className="history-error" role="alert">{error}</div>}
    <div className="records-container">
      {loading ? <div className="records-state"><span className="loader"/><strong>Loading sensor history</strong><p>Fetching {period} readings for {selectedStationRecord?.station_code || 'the selected station'}.</p></div>
        : !loading && records.length === 0 ? <div className="records-state"><span className="records-state-icon"><Clock3 size={19}/></span><strong>{error ? 'History is unavailable' : anomaliesOnly ? 'No anomalies in this date range' : 'No readings match these filters'}</strong><p>{error || `Saved ${period} readings${selectedStationRecord ? ` for ${selectedStationRecord.station_code}` : ''} will appear here when they match your filters.`}</p></div>
          : <><div className="table-scroll virtual-records" ref={tableViewport} onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}><table className="records-table"><thead><tr><th>DATE &amp; TIME</th><th>DAILY AVG WATER</th><th>DAILY AVG FLOW</th><th>STATUS</th></tr></thead><tbody>
            {startIndex > 0 && <tr aria-hidden="true" className="virtual-spacer"><td colSpan="4" style={{ height: startIndex * rowHeight }}/></tr>}
            {visibleRecords.map((record) => {
              const at = record.recorded_at || record.created_at || record.timestamp;
              const condition = record.drainage_condition || evaluateDrainageCondition(record, record.station || selectedStationRecord);
              return <tr key={`${period}-${record.id}-${at}`} className="virtual-record-row" style={{ height: rowHeight }}><td><span className="record-date">{formatPhilippineTime(at)}</span>{record.station?.station_code && <small>{record.station.station_code}</small>}</td><td>{formatValue(record.water_level_cm)} <small>cm</small></td><td>{formatValue(record.flow_rate, 2)} <small>L/min</small></td><td><RecordStatus status={condition.label}/></td></tr>;
            })}
            {endIndex < records.length && <tr aria-hidden="true" className="virtual-spacer"><td colSpan="4" style={{ height: (records.length - endIndex) * rowHeight }}/></tr>}
          </tbody></table></div><div className="record-card-list">{records.map((record) => {
            const at = record.recorded_at || record.created_at || record.timestamp;
            const condition = record.drainage_condition || evaluateDrainageCondition(record, record.station || selectedStationRecord);
            const recordStation = record.station || selectedStationRecord;
            const statusLabel = condition.code === 'normal' ? 'Normal' : condition.code === 'elevated_water' ? 'Warning' : condition.code === 'blockage_detected' ? 'Blockage' : 'Awaiting data';
            return <article className="record-card" key={`mobile-${period}-${record.id}-${at}`}><div className="record-card-heading"><div><strong>{recordStation?.location_name || recordStation?.station_code || 'Drainage station'}</strong><small>{recordStation?.station_code || 'Station'}</small></div><RecordStatus status={statusLabel}/></div><p className="record-card-time"><Clock3 size={14}/>{formatPhilippineTime(at)}</p><p className="record-card-time">Daily summary · {record.readings_count || 0} sensor readings</p><div className="record-card-metrics"><div><span>Average water level</span><strong>{formatValue(record.water_level_cm)} <small>cm</small></strong></div><div><span>Average flow rate</span><strong>{formatValue(record.flow_rate, 2)} <small>L/min</small></strong></div></div></article>;
          })}</div></>}
    </div>
    <div className="history-pagination"><span>{pagination.total ? `Showing ${pagination.from || 0}–${pagination.to || 0} of ${pagination.total}` : 'No records'}</span><div><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {pagination.current_page || page} of {pagination.last_page || 1}</span><button type="button" disabled={page >= pagination.last_page || loading} onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}>Next</button></div></div>
  </section>;
}

function FieldReportForm({ role, stations, selectedStationId, onStationChange, onSubmitted }) {
  const sortedStations = sortStations(stations);
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
    if (!stationId || !subject.trim() || details.trim().length < 20) {
      setFeedback({ type: 'error', message: !stationId ? 'Select a drainage station for this report.' : 'Enter a descriptive subject and at least 20 characters of observation details.' });
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
      <label htmlFor="report-station">Drainage station</label><select id="report-station" name="station_id" value={stationId} onChange={(event) => onStationChange(event.target.value || null)} required disabled={!stations.length}><option value="" disabled hidden>{stations.length ? 'Select a station' : 'No stations available'}</option>{sortedStations.map((station) => <option key={station.id} value={station.id}>{station.station_code} / {station.location_name}</option>)}</select>
      <label htmlFor="issue-subject">Issue subject</label><input id="issue-subject" name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={8} maxLength={120} placeholder="Debris buildup near roadside drain" required/>
      <label htmlFor="observation-details">Observation details</label><textarea id="observation-details" name="message" value={details} onChange={(event) => setDetails(event.target.value)} minLength={20} maxLength={2000} rows={4} placeholder="Describe what you observed and where it is located..." required/>
      {feedback && <p className={`report-feedback ${feedback.type}`} role="status">{feedback.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}<span>{feedback.message}</span></p>}
      <button className="report-submit" type="submit" disabled={busy || !stations.length} aria-busy={busy}><Send size={15} className={busy ? 'spin' : ''}/>{busy ? 'Submitting report...' : 'Submit Field Report'}</button>
    </form>
  </section>;
}

function ReportsList({ reports, loading, error, isAdmin, onStatusUpdate }) {
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleStatusChange = async (reportId, status) => {
    setUpdatingId(reportId);
    const result = await onStatusUpdate(reportId, status);
    setToast({
      type: result.ok ? 'success' : 'error',
      message: result.ok ? `Report marked ${reportStatusLabel(status).toLowerCase()}.` : result.message,
    });
    setUpdatingId(null);
  };
  return <section className="reports-list-panel"><div className="reports-list-heading"><div><span className="section-kicker">SUBMISSIONS</span><h3>Recent field reports</h3></div><span className="records-count">{reports.length} reports</span></div>
    {toast && <div className={`status-toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}><span>{toast.type === 'success' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}</span><p>{toast.message}</p><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>×</button></div>}
    {loading && reports.length === 0 ? <div className="records-state"><span className="loader"/><p>Loading reports...</p></div>
      : error && reports.length === 0 ? <div className="records-state"><strong>Reports unavailable</strong><p>{error}</p></div>
        : reports.length === 0 ? <div className="records-state"><span className="records-state-icon"><Clock4 size={18}/></span><strong>No reports submitted</strong><p>New field reports will appear here after submission.</p></div>
          : <div className="report-list">{reports.map((report) => <article className="report-list-item" key={report.id}><span className="report-status-mark"><AlertTriangle size={15}/></span><div className="report-list-main"><strong>{report.subject}</strong><p>{report.message}</p><small>{report.station ? `${report.station.station_code} / ${report.station.location_name} · ` : 'Station removed · '}{report.user?.name || 'Field user'} / {formatPhilippineTime(report.created_at)}</small></div>{isAdmin ? <label className="report-status-control" htmlFor={`report-status-${report.id}`}><span className="sr-only">Update report status</span><select id={`report-status-${report.id}`} name={`report_status_${report.id}`} aria-label={`Update status for ${report.subject}`} value={normalizedReportStatus(report.status)} disabled={updatingId === report.id} onChange={(event) => handleStatusChange(report.id, event.target.value)}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></label> : <span className={`report-list-status ${normalizedReportStatus(report.status)}`}>{reportStatusLabel(report.status)}</span>}</article>)}</div>}
  </section>;
}

function StationCard({ station, stationId }) {
  const reading = readingFor(station);
  const water = reading?.water_level_cm;
  const threshold = Number(station.warning_threshold_cm || 60);
  const condition = evaluateDrainageCondition(reading, station);
  const tone = conditionTone(condition.code);
  const nodeStatus = stationConnectivityStatus(station);
  const syncedAt = reading?.recorded_at || reading?.created_at || reading?.timestamp;
  return <article className="station-card" id={stationId}>
    <div className="station-heading"><div className="station-title"><span className="station-code">{station.station_code || 'UNASSIGNED'}</span><h2>{station.location_name || 'Unnamed location'}</h2><p className="location-line"><MapPin size={14}/>{station.latitude}, {station.longitude}</p></div><span className={`status-pill ${nodeStatus}`}><i/>{nodeStatus === 'maintenance' ? 'Maintenance' : nodeStatus === 'online' ? 'Online' : 'Offline'}</span></div>
    <div className="metrics-grid"><div className={`metric-tile water-${tone}`}><div className="metric-label"><Droplet size={16}/>Water level</div><div className="metric-value">{formatValue(water)} <small>cm</small></div><div className="level-track"><span style={{ width: `${Math.min(100, Math.max(0, Number(water) || 0))}%` }}/></div><div className="metric-hint">Warning at {formatValue(threshold, 0)} cm</div></div><div className="metric-tile flow-tile"><div className="metric-label"><Waves size={16}/>Flow rate</div><div className="metric-value">{formatValue(condition.flowRateLpm, 1)} <small>L/min</small></div><div className="metric-hint">Live sensor reading</div></div><div className={`blockage-tile ${tone}`}><span className="blockage-icon">{tone === 'critical' ? <ShieldAlert size={17}/> : tone === 'warning' ? <ArrowUp size={17}/> : tone === 'unknown' ? <CircleHelp size={17}/> : <Check size={17}/>}</span><span><small>Drainage condition</small><strong>{condition.label}</strong></span></div></div>
    <footer className="station-footer"><span><BatteryCharging size={15}/>{formatValue(reading?.battery_voltage, 2)} V</span><span className="sync-time">Last sync / {syncedAt ? formatPhilippineTime(syncedAt) : 'No readings yet'}</span></footer>
  </article>;
}

const blankStation = { station_code: '', location_name: '', latitude: CENTER.latitude, longitude: CENTER.longitude, status: 'active', warning_threshold_cm: 60 };

function StationManagement({ stations, onSaved }) {
  const sortedStations = sortStations(stations);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(blankStation);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const editing = Boolean(selectedId);

  const chooseStation = (event) => {
    const value = event.target.value;
    setSelectedId(value);
    const selected = stations.find((station) => String(station.id) === String(value));
    setForm(selected ? {
      station_code: selected.station_code || selected.code || '',
      location_name: selected.location_name || '',
      latitude: selected.latitude ?? '',
      longitude: selected.longitude ?? '',
      status: selected.status || 'active',
      warning_threshold_cm: selected.warning_threshold_cm ?? 60,
    } : blankStation);
    setFeedback(null);
  };

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };
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
      if (!editing) {
        setSelectedId('');
        setForm(blankStation);
      }
      await onSaved();
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

  return <section className="station-management"><div className="station-management-heading"><div><span className="section-kicker">ADMINISTRATION</span><h3>Manage stations</h3><p>Add or edit nodes, locations, operating state, and water warning limits.</p></div><label className="station-select-label" htmlFor="station-edit-selector">Edit existing node<select id="station-edit-selector" name="station_edit_selector" value={selectedId} onChange={chooseStation}><option value="">Add new station</option>{sortedStations.map((station) => <option key={station.id} value={station.id}>{station.station_code} / {station.location_name}</option>)}</select></label></div>
    <form className="station-admin-form" onSubmit={saveStation}>
      <label>Station code<input name="station_code" value={form.station_code} onChange={updateField} maxLength={32} placeholder="CAL-DRN-01" required/></label>
      <label>Location name<input name="location_name" value={form.location_name} onChange={updateField} maxLength={255} placeholder="Drainage location" required/></label>
      <label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" value={form.latitude} onChange={updateField} required/></label>
      <label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" value={form.longitude} onChange={updateField} required/></label>
      <label>Node state<select name="status" value={form.status} onChange={updateField}><option value="active">Online</option><option value="maintenance">Maintenance</option><option value="offline">Offline</option></select></label>
      <label>Warning threshold (cm)<input name="warning_threshold_cm" type="number" min="1" max="10000" step="0.1" value={form.warning_threshold_cm} onChange={updateField} required/></label>
      {feedback && <p className={`report-feedback ${feedback.type}`} role="status">{feedback.type === 'success' ? <CheckCircle2 size={15}/> : <AlertTriangle size={15}/>}<span>{feedback.message}</span></p>}
      <div className="station-form-actions"><button type="submit" className="report-submit" disabled={busy || deleting}>{busy ? 'Saving...' : editing ? 'Update station' : 'Add station'}</button>{editing && <><button type="button" className="secondary-action" onClick={() => chooseStation({ target: { value: '' } })}>Cancel edit</button><button type="button" className="delete-station-button" onClick={deleteStation} disabled={busy || deleting}>{deleting ? 'Deleting...' : 'Delete Station'}</button></>}</div>
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
      <article className="live-card"><div className="live-card-top"><span className={`live-icon ${tone === 'critical' ? 'rose' : tone === 'warning' ? 'amber' : tone === 'unknown' ? 'unknown' : 'green'}`}>{tone === 'critical' ? <AlertTriangle size={18}/> : tone === 'warning' ? <ArrowUp size={18}/> : tone === 'unknown' ? <CircleHelp size={18}/> : <Check size={18}/>}</span><span className={`condition-badge ${tone}`}>{tone === 'critical' ? 'CRITICAL' : tone === 'warning' ? 'WARNING' : tone === 'unknown' ? 'NO DATA' : 'CLEAR'}</span></div><p className="live-card-label">Drainage Status</p><div className={`status-reading ${tone === 'critical' ? 'is-critical' : tone === 'warning' ? 'is-warning' : ''}`}>{tone === 'critical' ? <AlertTriangle size={23}/> : tone === 'warning' ? <ArrowUp size={25}/> : tone === 'unknown' ? <CircleHelp size={22}/> : <Check size={24}/>}<strong>{condition.label}</strong></div><p className="live-card-note">{station?.location_name || 'Select a station'}</p></article>
      <article className="live-card"><div className="live-card-top"><span className={`live-icon ${isBlocked ? 'rose' : tone === 'unknown' ? 'unknown' : 'green'}`}><ShieldAlert size={18}/></span><span className={`condition-badge ${isBlocked ? 'critical' : tone === 'unknown' ? 'unknown' : 'normal'}`}>{isBlocked ? 'DETECTED' : tone === 'unknown' ? 'NO DATA' : 'SAFE'}</span></div><p className="live-card-label">Blockage Detection</p><div className={`status-reading ${isBlocked ? 'is-critical' : ''}`}><span className={`safe-indicator ${isBlocked ? 'unsafe' : ''}`}/><strong>{tone === 'unknown' ? 'Awaiting data' : isBlocked ? 'Blockage Detected' : 'Not Detected'}</strong></div><p className="live-card-note">Based on water depth and flow rate</p></article>
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
  const [tileError, setTileError] = useState(false);
  const sortedStations = sortStations(stations);
  const createNodeIcon = (status, conditionCode) => {
    const conditionClass = status === 'offline' ? 'offline' : status === 'maintenance' ? 'attention' : conditionCode === 'blockage_detected' ? 'critical' : conditionCode === 'elevated_water' ? 'attention' : 'online';
    return L.divIcon({
    className: 'leaflet-node-wrap',
    html: `<span class="leaflet-node ${conditionClass}"><i></i></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    });
  };

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const handleTileError = () => setTileError(true);

  return <section className="map-view">
    <SectionHeading kicker="FIELD NETWORK / CALAUAN, LAGUNA" title="Drainage station map" description="Pan or zoom the map. Select a station marker to view current sensor readings." aside={<span className="map-center-chip"><LocateFixed size={14}/>{CENTER.latitude} N / {CENTER.longitude} E</span>}/>
    <div className="station-map-frame"><div className="map-toolbar"><span><i className="map-toolbar-dot"/>LIVE STATION LOCATIONS</span><span className="map-scale">{tileError ? 'MAP TILES TEMPORARILY UNAVAILABLE' : 'OPENSTREETMAP / PUBLIC TILES'}</span></div>
      <MapContainer className="leaflet-station-map" center={[CENTER.latitude, CENTER.longitude]} zoom={14} scrollWheelZoom zoomControl attributionControl>
        <MapStationFocus station={selectedStation}/>
        <TileLayer key={tileUrl} className="dark-osm-tiles" eventHandlers={{ tileerror: handleTileError }} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url={tileUrl} subdomains="abc" maxZoom={19}/>
        {sortedStations.map((station, index) => {
          const latitude = Number(station.latitude) || CENTER.latitude;
          const longitude = Number(station.longitude) || CENTER.longitude;
          const reading = readingFor(station);
          const condition = evaluateDrainageCondition(reading, station);
          const nodeStatus = stationConnectivityStatus(station);
          return <Marker key={station.id || station.station_code || index} position={[latitude, longitude]} icon={createNodeIcon(nodeStatus, condition.code)}>
            <Popup className="station-leaflet-popup"><div className="leaflet-popup-content"><span className={`leaflet-status ${nodeStatus === 'online' ? 'up' : nodeStatus === 'maintenance' ? 'maintenance' : 'down'}`}><i/>{nodeStatus}</span><strong className="text-slate-900 dark:text-white font-bold">{station.station_code || 'Station node'}</strong><p className="text-slate-600 dark:text-slate-400 font-medium">{station.location_name || 'Calauan, Laguna'}</p><span className={`leaflet-condition ${conditionTone(condition.code)}`}>{condition.label}</span><div className="leaflet-popup-metrics"><span><small className="text-slate-600 dark:text-slate-400 font-medium">WATER DEPTH</small><b className="text-slate-900 dark:text-white font-bold">{formatValue(reading?.water_level_cm)} cm</b></span><span><small className="text-slate-600 dark:text-slate-400 font-medium">FLOW RATE</small><b className="text-slate-900 dark:text-white font-bold">{formatValue(reading?.flow_rate, 2)} L/min</b></span></div><button type="button" onClick={() => onOpenStation(station)}>Open sensor readings <ChevronRight size={14}/></button></div></Popup>
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
  const [fieldReports, setFieldReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkLive, setNetworkLive] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('agosense_active_tab');
    return tabs.some(({ id }) => id === savedTab) ? savedTab : 'overview';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Navigation is a drawer at every viewport size; the desktop rail is no longer permanent.
  const isMobileNav = true;
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('agosense_theme') || 'light');
  const mobileMenuToggleRef = useRef(null);
  const wasMenuOpen = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('agosense_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMobileMenuOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (wasMenuOpen.current && !mobileMenuOpen) mobileMenuToggleRef.current?.focus();
    wasMenuOpen.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

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
    localStorage.removeItem('agosense_active_tab');
    setActiveTab('overview');
    setToken(null); setUser(null); setDashboardData(null); setFieldReports([]); setError(''); setReportsError('');
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!localStorage.getItem('auth_token')) return;
    setLoading(true);
    try {
      const { data } = await api.get('/v1/dashboard');
      const loadedStations = asList(data.stations || data.data?.stations || data.data || []);
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
      return { ok: true, message: data.message || 'Report status updated.' };
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
          if (currentUser.role !== 'admin' && localStorage.getItem('agosense_active_tab') === approvalTab.id) {
            localStorage.setItem('agosense_active_tab', 'overview');
            setActiveTab('overview');
          }
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
    if (!token || activeTab !== 'reports') return undefined;
    const timer = window.setTimeout(fetchFieldReports, 0);
    return () => window.clearTimeout(timer);
  }, [token, activeTab, fetchFieldReports]);

  const stationsForSelection = asList(dashboardData?.stations || dashboardData?.data?.stations || EMPTY_STATIONS);

  if (!token) return authView === 'login'
    ? <Login onLoginSuccess={acceptLogin} onSwitchToRegister={() => setAuthView('register')}/>
    : <Register onRegisterSuccess={acceptLogin} onSwitchToLogin={() => setAuthView('login')}/>;

  const stations = stationsForSelection;
  const sortedStations = sortStations(stations);
  const isAdmin = user?.role === 'admin';
  const visibleTabs = isAdmin ? [...tabs, approvalTab] : tabs;
  const role = isAdmin ? 'admin' : 'viewer';
  const onlineStations = stations.filter((station) => stationConnectivityStatus(station) === 'online').length;
  const attentionStations = stations.filter((station) => stationConnectivityStatus(station) !== 'online' || ['blockage_detected', 'elevated_water'].includes(evaluateDrainageCondition(readingFor(station), station).code)).length;
  const selectedStation = stations.find((station) => String(station.id) === String(selectedStationId)) || sortedStations[0];
  const selectTab = (tabId) => {
    if (!visibleTabs.some(({ id }) => id === tabId)) return;
    setActiveTab(tabId);
    localStorage.setItem('agosense_active_tab', tabId);
    setMobileMenuOpen(false);
  };
  const openStationTelemetry = (station) => {
    setSelectedStationId(String(station.id));
    selectTab('telemetry');
    window.setTimeout(() => document.getElementById(`station-detail-${station.id || station.station_code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  return <DashboardErrorBoundary><div className="dashboard-shell">
    <header className="topbar">
      <div className="topbar-left"><button ref={mobileMenuToggleRef} className="mobile-menu-toggle text-slate-800 dark:text-white" type="button" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenuOpen} aria-controls="dashboard-navigation" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X size={19}/> : <Menu size={19}/>}</button><Brand href="#dashboard" onClick={() => selectTab('overview')}/></div>
      <div className="topbar-right"><label className="global-station-switcher" htmlFor="global-station-selector"><span className="sr-only">Select station</span><select id="global-station-selector" name="selected_station_id" value={selectedStation?.id || ''} onChange={(event) => setSelectedStationId(event.target.value || null)} disabled={!stations.length} aria-label="Select monitored station" className="h-9 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer transition-colors"><option value="" disabled hidden>Select station</option>{sortedStations.map((station) => <option key={station.id} value={station.id}>{station.station_code || station.code || station.location_name || station.name || `Station ${station.id}`}</option>)}</select></label><div className="desktop-auth-controls"><span className={`network-state ${networkLive ? 'online' : 'offline'}`}><i/>{networkLive ? 'Network live' : 'Network offline'}</span><span className={`role-badge ${userLoading ? 'pending' : isAdmin ? 'admin' : 'viewer'}`}>{isAdmin ? <Cog size={13}/> : <ShieldAlert size={13}/>}<span>{userLoading ? 'Checking role' : isAdmin ? 'Admin' : 'Viewer'}</span></span><button className="logout-button" type="button" onClick={logout}><LogOut size={16}/><span>Sign out</span></button></div></div>
    </header>
    <div className="dashboard-workspace">
      <Sidebar
        tabs={visibleTabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isMobile={isMobileNav}
        networkLive={networkLive}
        isAdmin={isAdmin}
        userLoading={userLoading}
        onLogout={logout}
      />
      <main className="dashboard-main" id="dashboard">
      {error && <div className="alert-banner" role="alert"><AlertTriangle size={18}/><span>{error}</span><button onClick={fetchDashboard}>Retry</button></div>}

      {activeTab === 'overview' && <section className="tab-page overview-page">
        <div className="page-intro"><div><p className="eyebrow location-tag"><MapPin size={13}/> CALAUAN, LAGUNA</p><h1>Drainage overview</h1><p className="intro-copy">{userLoading ? 'Loading access profile...' : isAdmin ? 'Admin Portal: Full station control' : 'Resident Portal: Live municipal monitoring view'}</p></div><div className="intro-actions">{isAdmin && <button className="manage-stations-button" type="button" onClick={() => selectTab('map')}><Cog size={15}/>Manage Stations</button>}<button className="refresh-button" onClick={fetchDashboard} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Refreshing live data' : 'Refresh live data'}</button></div></div>
        <div className="summary-row"><div><span className="summary-label">Monitored stations</span><strong>{stations.length.toString().padStart(2, '0')}</strong></div><div><span className="summary-label">Online</span><strong className="text-emerald">{onlineStations.toString().padStart(2, '0')}</strong></div><div><span className="summary-label">Attention required</span><strong className="text-amber">{attentionStations.toString().padStart(2, '0')}</strong></div><div className="summary-updated"><span className="summary-label">Access level</span><strong>{userLoading ? 'Checking role' : isAdmin ? 'Admin / full control' : 'Viewer / live view'}</strong><small>Auto refresh / 30 sec</small></div></div>
        <div className="overview-grid"><section className="overview-panel"><div className="panel-heading"><div><span className="panel-kicker">FIELD NETWORK</span><h2>Station status</h2></div><button className="text-action" onClick={() => selectTab('telemetry')}>Live sensor readings <ChevronRight size={14}/></button></div>{stations.length ? <div className="overview-station-list">{sortedStations.slice(0, 6).map((station, index) => <button className="overview-station-row" key={station.id || station.station_code || index} onClick={() => openStationTelemetry(station)}><span className={`station-health ${stationConnectivityStatus(station) === 'online' ? 'healthy' : stationConnectivityStatus(station) === 'maintenance' ? 'attention' : 'offline'}`}/><span className="overview-node-code">{station.station_code || 'UNASSIGNED'}</span><span className="overview-node-name">{station.location_name || 'Unnamed station'}</span><span className="overview-node-level">{formatValue(readingFor(station)?.water_level_cm)} <small>cm</small></span><ChevronRight size={14}/></button>)}</div> : <div className="inventory-empty">{loading ? 'Loading station nodes...' : 'No stations are currently available.'}</div>}</section>
          <section className="overview-panel network-panel"><div className="panel-heading"><div><span className="panel-kicker">SYSTEM HEALTH</span><h2>Operations summary</h2></div><span className={`system-state ${networkLive ? 'up' : 'down'}`}><i/>{networkLive ? 'OPERATIONAL' : 'CHECK LINK'}</span></div><div className="operation-metric"><span><Activity size={15}/>API connection</span><strong>{networkLive ? 'Connected' : 'Awaiting response'}</strong></div><div className="operation-metric"><span><Gauge size={15}/>Field stations</span><strong>{onlineStations} / {stations.length} online</strong></div><div className="operation-metric"><span><Clock3 size={15}/>Refresh cadence</span><strong>30 seconds</strong></div><button className="map-shortcut" onClick={() => selectTab('map')}><MapPin size={15}/>Open station map<ChevronRight size={14}/></button></section></div>
      </section>}

      {activeTab === 'telemetry' && <section className="tab-page telemetry-page">{loading && !dashboardData ? <div className="loading-panel compact-loader"><span className="loader"/><p>Refreshing live data...</p></div> : <TelemetryCards station={selectedStation}/>}<div className="station-details"><div className="station-details-label"><PanelsTopLeft size={15}/><span>Station inventory</span><small>{stations.length} registered</small></div>{stations.length ? <div className="station-grid">{sortedStations.map((station, index) => <StationCard key={station.id || station.station_code || index} station={station} stationId={`station-detail-${station.id || station.station_code || index}`}/>)}</div> : <div className="inventory-empty">No stations are currently available. Stations will appear after they are registered with the monitoring service.</div>}</div></section>}
      {activeTab === 'map' && <section className="tab-page"><StationMap stations={stations} selectedStation={selectedStation} onOpenStation={openStationTelemetry}/>{isAdmin && <StationManagement stations={stations} onSaved={fetchDashboard}/>}</section>}
      {activeTab === 'reports' && <section className="tab-page reports-page"><div className="page-intro compact-intro"><div><p className="eyebrow">FIELD OPERATIONS</p><h1>Field reports</h1><p className="intro-copy">Submit a local observation and review reports available to your account.</p></div><span className="role-context">{isAdmin ? 'ADMIN VIEW / ALL SUBMISSIONS' : 'VIEWER / YOUR SUBMISSIONS'}</span></div><FieldReportForm role={role} stations={stations} selectedStationId={selectedStation?.id ? String(selectedStation.id) : ''} onStationChange={setSelectedStationId} onSubmitted={fetchFieldReports}/><ReportsList reports={fieldReports} loading={reportsLoading} error={reportsError} isAdmin={isAdmin} onStatusUpdate={updateReportStatus}/></section>}
      {activeTab === 'history' && <section className="tab-page history-page"><RecordsTable key={selectedStation?.id || 'all-stations'} stations={stations} selectedStation={selectedStation}/></section>}
      {activeTab === 'settings' && <section className="tab-page"><SettingsPage key={`${selectedStation?.id || 'no-station'}-${selectedStation?.warning_threshold_cm ?? 60}`} theme={theme} setTheme={setTheme} stations={stations} selectedStation={selectedStation} onThresholdSaved={fetchDashboard} isAdmin={isAdmin}/></section>}
      {activeTab === 'approvals' && isAdmin && <section className="tab-page"><PendingUsersList/></section>}
      </main>
    </div>
  </div></DashboardErrorBoundary>;
}

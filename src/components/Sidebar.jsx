import { Cog, LogOut, ShieldAlert } from 'lucide-react';

export default function Sidebar({
  tabs,
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  isMobile,
  networkLive,
  isAdmin,
  userLoading,
  onLogout,
}) {
  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    if (isMobile) onClose();
  };

  return <>
    <nav
      id="dashboard-navigation"
      className={`tab-navigation ${isOpen ? 'is-open' : ''}`}
      aria-label="Dashboard sections"
      inert={isMobile && !isOpen}
    >
      <span className="drawer-group-label font-bold">MONITORING</span>
      {tabs.slice(0, 5).map(({ id, label, icon: Icon }) => <button
        key={id}
        type="button"
        className={`tab-button ${activeTab === id ? 'active' : ''}`}
        onClick={() => handleTabClick(id)}
        aria-current={activeTab === id ? 'page' : undefined}
      ><Icon size={18}/><span>{label}</span></button>)}
      <span className="drawer-group-label settings-group font-bold">ACCOUNT</span>
      {tabs.slice(5).map(({ id, label, icon: Icon }) => <button
        key={id}
        type="button"
        className={`tab-button ${activeTab === id ? 'active' : ''}`}
        onClick={() => handleTabClick(id)}
        aria-current={activeTab === id ? 'page' : undefined}
      ><Icon size={18}/><span>{label}</span></button>)}

      <div className="mobile-drawer-footer">
        <span className={`network-state ${networkLive ? 'online' : 'offline'}`}><i/>{networkLive ? 'Network live' : 'Network offline'}</span>
        <span className={`role-badge ${userLoading ? 'pending' : isAdmin ? 'admin' : 'viewer'}`}>
          {isAdmin ? <Cog size={13}/> : <ShieldAlert size={13}/>}
          <span>{userLoading ? 'Checking role' : isAdmin ? 'Admin' : 'Viewer'}</span>
        </span>
        <button className="logout-button" type="button" onClick={onLogout}><LogOut size={18}/><span>Sign out</span></button>
      </div>
    </nav>

    {isMobile && isOpen && <button className="drawer-backdrop" type="button" aria-label="Close navigation menu" onClick={onClose}/>}
  </>;
}

export default function NotificationBell() {
  return (
    <details className="platform-popover platform-notifications">
      <summary className="platform-icon-button" aria-label="Open notifications">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          <path d="M6.5 10a5.5 5.5 0 0 1 11 0v3.2l1.5 2.3H5l1.5-2.3V10Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M10 18.5h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="platform-popover-panel platform-notification-panel">
        <div className="platform-popover-heading">
          <strong>Notifications</strong>
          <span>0 unread</span>
        </div>
        <div className="platform-empty-state">
          <span aria-hidden="true">✓</span>
          <strong>You&apos;re all caught up</strong>
          <p>Mercury will surface approvals and critical platform signals here.</p>
        </div>
      </div>
    </details>
  );
}

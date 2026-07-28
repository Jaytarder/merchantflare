import Link from "next/link";
import type { PlatformNotification } from "../../../lib/platform";

export default function NotificationBell({
  notifications,
}: {
  notifications: PlatformNotification[];
}) {
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

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
          <span>{unreadCount} unread</span>
        </div>
        {notifications.length === 0 ? (
          <div className="platform-empty-state">
            <span aria-hidden="true">✓</span>
            <strong>You&apos;re all caught up</strong>
            <p>No active platform notifications.</p>
          </div>
        ) : (
          <div className="platform-notification-list">
            {notifications.map((notification) => {
              const content = (
                <>
                  <span
                    className={`platform-notification-severity is-${notification.severity}`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{notification.body}</small>
                  </span>
                </>
              );
              return notification.actionHref ? (
                <Link
                  className="platform-notification-item"
                  href={notification.actionHref}
                  key={notification.id}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className="platform-notification-item"
                  key={notification.id}
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </details>
  );
}

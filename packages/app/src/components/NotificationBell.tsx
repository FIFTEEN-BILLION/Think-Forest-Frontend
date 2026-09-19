// 알림 종과 목록(명세 21절).
//
// 붙이는 곳: 앱 공통 헤더(`AppLayout` 의 오른쪽 도구 줄)에 `<NotificationBell />` 한 줄이면 된다.
// 이번 작업에서는 다른 트랙이 같은 파일을 고치고 있어 헤더를 건드리지 않고 컴포넌트만 내보낸다.
//
//   import { NotificationBell } from '../components/NotificationBell';
//   … <NotificationBell />  // 헤더의 테마 버튼 옆
//
// 푸시 토큰 등록(`POST /devices`)은 네이티브 앱에서만 뜻이 있어 WebView 다리로 받는다.

import { useCallback, useEffect, useRef, useState } from 'react';
import { V1Error } from '../api/v1/client';
import {
  getNotificationSettings,
  listNotifications,
  markNotificationRead,
  registerDevice,
  unregisterDevice,
  updateNotificationSettings,
} from '../api/v1/endpoints';
import type { NotificationItem, NotificationSettings } from '../api/v1/types';
import { useAuth } from '../providers/AuthProvider';
import { listenToNative } from '../voice/nativeBridge';
import { Icon } from './Icon';

const SETTING_LABELS: ReadonlyArray<[keyof Omit<NotificationSettings, 'updatedAt'>, string]> = [
  ['pushEnabled', '앱 밖 알림 받기'],
  ['shareRequests', '이야기 공유 요청'],
  ['safetyNotices', '안전 안내'],
  ['activitySummary', '주간 활동 요약'],
];

function whenText(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  const minutes = Math.round((Date.now() - at.getTime()) / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}시간 전`;
  return at.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

/**
 * 네이티브 셸이 푸시 토큰을 보내오면 서버에 등록하고, 화면을 떠날 때 해제한다(명세 21).
 * 웹 브라우저에서는 아무 일도 하지 않는다.
 */
export function useNativeDeviceRegistration() {
  const { client, status } = useAuth();
  const deviceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'signedIn') return;
    return listenToNative((message) => {
      if (message.type !== 'PUSH_TOKEN') return;
      void registerDevice(client, {
        platform: message.platform,
        pushToken: message.pushToken,
        installationId: message.installationId,
        locale: 'ko-KR',
      })
        .then((response) => {
          deviceIdRef.current = response.device.id;
        })
        .catch(() => undefined);
    });
  }, [client, status]);
  useEffect(() => {
    if (status === 'signedIn') return;
    const deviceId = deviceIdRef.current;
    deviceIdRef.current = null;
    if (deviceId) void unregisterDevice(client, deviceId).catch(() => undefined);
  }, [client, status]);
}

export function NotificationBell() {
  const { client, status } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [error, setError] = useState('');
  // 한 번이라도 불러왔는지. 상태를 effect 안에서 바로 바꾸지 않으려고 불러온 뒤에만 세운다.
  const [loaded, setLoaded] = useState(false);
  useNativeDeviceRegistration();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const page = await listNotifications(client, { limit: 20 }, signal);
        setItems(page.items);
        setUnread(page.unreadCount);
        setError('');
      } catch (caught) {
        if (caught instanceof V1Error && caught.status === 401) return;
        setError(caught instanceof V1Error ? caught.message : '알림을 불러오지 못했어요.');
      } finally {
        setLoaded(true);
      }
    },
    [client],
  );

  // 읽지 않은 개수를 먼저 확인한다. 자세한 목록은 종을 눌렀을 때 다시 읽는다.
  useEffect(() => {
    if (status !== 'signedIn') return;
    const controller = new AbortController();
    listNotifications(client, { limit: 20 }, controller.signal)
      .then((page) => {
        setItems(page.items);
        setUnread(page.unreadCount);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, [client, status]);

  useEffect(() => {
    if (!open || settings) return;
    void getNotificationSettings(client)
      .then((response) => setSettings(response.settings))
      .catch(() => undefined);
  }, [client, open, settings]);

  if (status !== 'signedIn') return null;

  const read = async (item: NotificationItem) => {
    if (item.readAt) return;
    setItems((current) =>
      current.map((row) =>
        row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row,
      ),
    );
    setUnread((count) => Math.max(0, count - 1));
    try {
      await markNotificationRead(client, item.id);
    } catch {
      void load();
    }
  };

  const toggle = async (key: keyof Omit<NotificationSettings, 'updatedAt'>) => {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try {
      const response = await updateNotificationSettings(client, { [key]: next[key] });
      setSettings(response.settings);
    } catch {
      setSettings(settings);
      setError('알림 설정을 바꾸지 못했어요.');
    }
  };

  return (
    <div className="notification-bell" style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        aria-label={unread ? `알림 ${unread}개` : '알림'}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
      >
        <Icon name="info" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: '1.1rem',
              padding: '0 0.25rem',
              borderRadius: '999px',
              background: '#e2564d',
              color: '#fff',
              fontSize: '0.7rem',
              lineHeight: '1.1rem',
              textAlign: 'center',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="panel"
          role="dialog"
          aria-label="알림"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 0.5rem)',
            zIndex: 30,
            width: 'min(20rem, 86vw)',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '0.9rem',
            display: 'grid',
            gap: '0.6rem',
          }}
        >
          <strong>알림</strong>
          {error && <small role="alert">{error}</small>}
          {!loaded && items.length === 0 && <small>불러오는 중…</small>}
          {loaded && items.length === 0 && !error && <small>아직 새로운 소식이 없어요.</small>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void read(item)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: '0.7rem',
                    padding: '0.6rem',
                    cursor: item.readAt ? 'default' : 'pointer',
                    background: item.readAt ? 'transparent' : 'rgba(80,160,120,0.12)',
                  }}
                >
                  <strong style={{ display: 'block' }}>{item.title}</strong>
                  <span style={{ display: 'block', fontSize: '0.9rem' }}>{item.body}</span>
                  <small style={{ opacity: 0.7 }}>{whenText(item.createdAt)}</small>
                </button>
              </li>
            ))}
          </ul>
          {settings && (
            <div
              style={{
                display: 'grid',
                gap: '0.3rem',
                borderTop: '1px solid rgba(0,0,0,0.08)',
                paddingTop: '0.6rem',
              }}
            >
              <small style={{ opacity: 0.7 }}>알림 설정</small>
              {SETTING_LABELS.map(([key, label]) => (
                <label key={key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={() => void toggle(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useCallback } from 'react';

type MessagePayload = {
  type: string;
  data?: unknown;
};

export function useMultiTabSync(
  channel: string,
  onMessage: (payload: MessagePayload) => void
) {
  const bcRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(channel);
    bcRef.current = bc;

    bc.onmessage = (ev: MessageEvent<MessagePayload>) => {
      onMessage(ev.data);
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [channel, onMessage]);

  const broadcast = useCallback(
    (payload: MessagePayload) => {
      bcRef.current?.postMessage(payload);
    },
    []
  );

  return { broadcast };
}

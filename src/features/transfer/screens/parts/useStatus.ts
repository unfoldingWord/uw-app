import { useEffect, useState } from 'react';
import type { StatusView, TransferService } from '../../service';

const statusPollMs = 500;

export function useStatus(service: TransferService, active: boolean): StatusView | undefined {
  const [status, setStatus] = useState<StatusView | undefined>(undefined);
  useEffect(() => {
    if (!active) {
      setStatus(undefined);
      return undefined;
    }
    setStatus(service.status());
    const timer = setInterval(() => setStatus(service.status()), statusPollMs);
    return () => clearInterval(timer);
  }, [service, active]);
  return status;
}

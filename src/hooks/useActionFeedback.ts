import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type ActionResult = {
  success: boolean;
  message: string;
};

export function useActionFeedback() {
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (action: () => Promise<ActionResult>, title = 'Action') => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await action();
      Alert.alert(result.success ? `${title} complete` : `${title} failed`, result.message);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { busy, run };
}

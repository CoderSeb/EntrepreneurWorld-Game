import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type ActionResult = {
  success: boolean;
  message: string;
};

type ActionAlertLabels = {
  complete: string;
  failed: string;
};

export function useActionFeedback() {
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (action: () => Promise<ActionResult>, title = 'Action', labels?: ActionAlertLabels) => {
      if (busy) {
        return;
      }
      setBusy(true);
      try {
        const result = await action();
        const successTitle = labels?.complete ?? `${title} complete`;
        const failureTitle = labels?.failed ?? `${title} failed`;
        Alert.alert(result.success ? successTitle : failureTitle, result.message);
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  return { busy, run };
}

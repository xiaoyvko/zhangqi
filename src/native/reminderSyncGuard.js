export function guardReminderSync(task, {
  isMounted,
  onSuccess,
  onFailure,
}) {
  return task.then(
    (value) => {
      if (isMounted()) onSuccess(value);
      return value;
    },
    (error) => {
      if (isMounted()) onFailure(error);
      throw error;
    },
  );
}

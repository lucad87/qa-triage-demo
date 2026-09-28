export type Task = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
};

type StoreState = {
  tasks: Task[];
  seq: number;
};

const globalStore = globalThis as unknown as { __taskdeck?: StoreState };

function store(): StoreState {
  if (!globalStore.__taskdeck) {
    globalStore.__taskdeck = { tasks: [], seq: 0 };
  }
  return globalStore.__taskdeck;
}

export function listTasks(): Task[] {
  return store().tasks;
}

export function createTask(title: string): Task {
  const state = store();
  const task: Task = {
    id: `t${++state.seq}`,
    title: title.trim(),
    done: false,
    createdAt: Date.now(),
  };
  state.tasks.push(task);
  return task;
}

export function toggleTask(id: string): Task | undefined {
  const task = store().tasks.find((candidate) => candidate.id === id);
  if (task) {
    task.done = !task.done;
  }
  return task;
}

export function resetTasks(): void {
  const state = store();
  state.tasks = [];
  state.seq = 0;
}

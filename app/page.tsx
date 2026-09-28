"use client";

import { useEffect, useState, type FormEvent } from "react";

type Task = {
  id: string;
  title: string;
  done: boolean;
};

type Filter = "all" | "active" | "done";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/tasks");
    setTasks((await res.json()) as Task[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    await load();
  }

  async function toggle(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "PATCH" });
    await load();
  }

  const visible = tasks.filter((task) =>
    filter === "all" ? true : filter === "active" ? !task.done : task.done,
  );
  const activeCount = tasks.filter((task) => !task.done).length;

  return (
    <main>
      <h1>TaskDeck</h1>
      <p className="tagline">A tiny task board — the app under test.</p>

      <form onSubmit={addTask}>
        <input
          aria-label="New task"
          placeholder="What needs doing?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <div role="group" aria-label="Filters" className="filters">
        {(["all", "active", "done"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      <p className="count">
        <span data-testid="active-count">{activeCount}</span> active
      </p>

      {loading ? (
        <p>Loading…</p>
      ) : visible.length === 0 ? (
        <p data-testid="empty-state">Nothing here yet.</p>
      ) : (
        <ul data-testid="task-list">
          {visible.map((task) => (
            <li key={task.id} data-testid="task-item">
              <label>
                <input
                  type="checkbox"
                  checked={task.done}
                  aria-label={`Mark ${task.title} as done`}
                  onChange={() => void toggle(task.id)}
                />
                <span className={task.done ? "done" : undefined}>{task.title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

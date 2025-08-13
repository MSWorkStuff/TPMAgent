export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{ name: string; color: string }>;
}

// Client-safe helper that calls our Next.js API route
export async function fetchIssues(owner: string, repo: string): Promise<Issue[]> {
  const url = `/api/issues?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch issues (${res.status}): ${text}`);
  }
  return res.json();
}


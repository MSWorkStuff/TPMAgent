import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = request.nextUrl.searchParams.get("owner");
  const repo = request.nextUrl.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
  }

  const gh = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=all\u0026per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    }
  );

  if (!gh.ok) {
    const text = await gh.text();
    return NextResponse.json(
      { error: "GitHub API error", status: gh.status, body: text },
      { status: gh.status }
    );
  }

  const data = await gh.json();
  return NextResponse.json(data);
}


import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getToken } from "next-auth/jwt"
import { authOptions } from "../auth/[...nextauth]/auth-options"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const token = await getToken({ req: request })
  
  if (!token?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!session || !session.user) {
    return NextResponse.json({ error: "Session missing" }, { status: 401 })
  }

  try {
    const response = await fetch("https://api.github.com/user/repos?affiliation=owner,collaborator&sort=updated&per_page=100", {
      headers: {
        "Authorization": `Bearer ${token.accessToken}`,
        "Accept": "application/vnd.github.v3+json"
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const repos = await response.json()
    
    // Filter repositories with write access
    const writableRepos = repos.filter((repo: { permissions?: { push?: boolean; admin?: boolean }; owner?: { login?: string } }) => 
      repo.permissions?.push || repo.permissions?.admin || repo.owner?.login === session.user?.name
    )

    return NextResponse.json(writableRepos)
  } catch (error) {
    console.error('Failed to fetch repositories:', error)
    return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 })
  }
}

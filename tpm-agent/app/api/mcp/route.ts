import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "../auth/[...nextauth]/route"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  
  try {
    const response = await fetch("https://api.githubcopilot.com/mcp/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: "MCP request failed" }, { status: 500 })
  }
}

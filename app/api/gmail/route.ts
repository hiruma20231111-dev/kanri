import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { google } from "googleapis"

function decodeBase64(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
}

function extractBody(payload: any): string {
  if (!payload) return ""
  if (payload.body?.data) return decodeBase64(payload.body.data)
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
    for (const part of payload.parts) {
      const body = extractBody(part)
      if (body) return body
    }
  }
  return ""
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accessToken = (session as any).accessToken
  if (!accessToken) return NextResponse.json({ error: "No access token" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const maxResults = parseInt(searchParams.get("maxResults") || "20")

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    const gmail = google.gmail({ version: "v1", auth })

    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q: "in:inbox",
    })

    const messageIds = listRes.data.messages || []

    const messages = await Promise.all(
      messageIds.slice(0, 15).map(async ({ id }) => {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: id!,
          format: "full",
        })

        const headers = msg.data.payload?.headers || []
        const subject = headers.find((h) => h.name === "Subject")?.value || "(件名なし)"
        const from = headers.find((h) => h.name === "From")?.value || ""
        const date = headers.find((h) => h.name === "Date")?.value || ""

        const fromMatch = from.match(/^(.*?)\s*<(.+)>$/)
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, "") : from
        const fromEmail = fromMatch ? fromMatch[2] : from

        const body = extractBody(msg.data.payload)
        const isRead = !msg.data.labelIds?.includes("UNREAD")

        return {
          id: msg.data.id,
          threadId: msg.data.threadId,
          subject,
          from: fromEmail,
          fromName,
          date,
          snippet: msg.data.snippet || "",
          body: body.substring(0, 3000),
          isRead,
        }
      })
    )

    return NextResponse.json({ messages })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = String(body?.query || "").trim()
    const maxResults = Number.isFinite(body?.maxResults) ? Number(body.maxResults) : 3

    if (!query) {
      return NextResponse.json({ summary: "" }, { status: 200 })
    }

    const esearchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi")
    esearchUrl.searchParams.set("db", "pubmed")
    esearchUrl.searchParams.set("retmode", "json")
    esearchUrl.searchParams.set("retmax", String(Math.min(Math.max(maxResults, 1), 5)))
    esearchUrl.searchParams.set("term", query)

    const esearchRes = await fetch(esearchUrl.toString())
    if (!esearchRes.ok) {
      return NextResponse.json({ summary: "" }, { status: esearchRes.status })
    }
    const esearchJson = await esearchRes.json()
    const ids: string[] = esearchJson?.esearchresult?.idlist || []
    if (!ids.length) {
      return NextResponse.json({ summary: "" }, { status: 200 })
    }

    const esummaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi")
    esummaryUrl.searchParams.set("db", "pubmed")
    esummaryUrl.searchParams.set("retmode", "json")
    esummaryUrl.searchParams.set("id", ids.join(","))

    const efetchUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    const [esummaryRes, efetchRes] = await Promise.all([
      fetch(esummaryUrl.toString()),
      fetch(efetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          db: "pubmed",
          rettype: "abstract",
          retmode: "text",
          id: ids.join(","),
        }).toString(),
      }),
    ])

    let items: { pmid: string; title: string; url: string }[] = []
    if (esummaryRes.ok) {
      const esummaryJson = await esummaryRes.json()
      const result = esummaryJson?.result || {}
      items = ids
        .map((id: string) => {
          const item = result[id]
          const title = String(item?.title || "").trim()
          return {
            pmid: id,
            title,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          }
        })
        .filter((item: { title: string }) => Boolean(item.title))
    }

    let summary = ""
    if (efetchRes.ok) {
      const text = await efetchRes.text()
      summary = text
        .split(/\n{2,}/g)
        .map((block) => block.trim())
        .filter(Boolean)
        .slice(0, maxResults)
        .join("\n\n")
    }

    return NextResponse.json({ summary, items }, { status: 200 })
  } catch {
    return NextResponse.json({ summary: "", items: [] }, { status: 200 })
  }
}

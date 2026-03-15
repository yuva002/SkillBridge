const API_BASE = "/api"

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`

  console.log("➡️ API REQUEST:", options.method || "GET", url)

  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    })

    const text = await res.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    console.log("⬅️ API RESPONSE:", url, data)

    if (!res.ok) {
      throw new Error(data?.error || "API request failed")
    }

    return data
  } catch (err) {
    console.error("❌ API ERROR:", url, err)
    throw err
  }
}

export async function getStats() {
  const data = await request("/stats")
  return data
}

export async function getCandidates() {
  return await request("/candidates")
}

export async function addCandidate(candidate) {
  const data = await request("/candidates", {
    method: "POST",
    body: JSON.stringify(candidate),
  })
  return data
}

export async function triggerCall(id) {
  const data = await request("/trigger-call", {
    method: "POST",
    body: JSON.stringify({ candidate_id: id }),
  })
  return data
}

export async function getResults() {
  const data = await request("/results")
  return data.results || data || []
}
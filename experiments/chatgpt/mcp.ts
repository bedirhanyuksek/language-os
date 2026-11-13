import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { catalog } from '../../src/content/catalog'
import { buildSpeakingPrompt, parseSpeakingReport, reportSchema, type SpeakingReport, type SpeakingSession } from '../../src/domain/speaking'

const lesson = catalog.en.unit.lessons[0]
export const session: SpeakingSession = {
  id: '72752ef8-871a-4a80-8299-ccfeec0dc4e1',
  lessonId: lesson.id, language: 'en', target: 'B2+', createdAt: '2026-11-13T10:00:00.000Z',
}
const context = {
  sessionId: session.id,
  language: session.language,
  cefrTarget: session.target,
  lessonId: lesson.id,
  objective: lesson.objective,
  targetGrammar: lesson.speaking!.grammar,
  vocabulary: lesson.vocabulary.map(({ id, term }) => ({ id, term })),
  previousRecurringMistakes: ['Synthetic example: I have joined the team last May.'],
  instructions: buildSpeakingPrompt(session, lesson, {
    reason: 'Synthetic lesson context for a local prototype.',
    concepts: lesson.concepts.map(({ id, label }) => ({ id, label, basis: 'Synthetic fixture' })),
    vocabulary: lesson.vocabulary.map(({ id, term }) => ({ id, term })),
    previousMistakes: ['Synthetic example: I have joined the team last May.'],
    goals: lesson.speaking!.goals,
  }),
}

export function createPrototype() {
  let draft: SpeakingReport | undefined
  function createMcp() {
    const mcp = new McpServer({ name: 'language-os-speaking-fixture', version: '0.1.0' })
    mcp.registerTool('get_speaking_context', {
      description: 'Read the synthetic Language OS speaking session for this test.',
      inputSchema: { sessionId: z.literal(session.id) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    }, () => ({
      structuredContent: context,
      content: [{ type: 'text', text: JSON.stringify(context) }],
    }))
    mcp.registerTool('stage_speaking_report', {
      description: 'Stage a report for the synthetic session. This saves one draft in memory for review.',
      inputSchema: { report: reportSchema },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, ({ report }) => {
      try {
        const validated = parseSpeakingReport(JSON.stringify(report), session, lesson)
        if (draft && JSON.stringify(draft) !== JSON.stringify(validated)) throw new Error('Oturumun zaten farklı bir taslak raporu var.')
        const status = draft ? 'already_staged' : 'staged'
        draft ??= validated
        return { structuredContent: { sessionId: session.id, status }, content: [{ type: 'text', text: status }] }
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Rapor reddedildi.' }] }
      }
    })
    return mcp
  }
  const server = createServer(async (request, response) => {
    const origin = request.headers.origin
    const { port } = server.address() as { port: number }
    const expected = `127.0.0.1:${port}`
    if (request.headers.host !== expected || (origin !== undefined && origin !== `http://${expected}`)) {
      response.writeHead(403).end()
      return
    }
    if (request.url !== '/mcp') {
      response.writeHead(404).end()
      return
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST' }).end()
      return
    }
    const mcp = createMcp()
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    response.once('close', () => { void mcp.close() })
    try {
      await mcp.connect(transport)
      await transport.handleRequest(request, response)
    } catch {
      if (!response.headersSent) response.writeHead(500)
      response.end()
    }
  })
  return { server, readDraft: () => draft && structuredClone(draft) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createPrototype().server.listen(8787, '127.0.0.1', () =>
    console.log(`http://127.0.0.1:8787/mcp · örnek oturum ${session.id}`))
}

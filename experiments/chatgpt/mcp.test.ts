import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { legacyCatalog as catalog } from '../../src/content/catalog'
import type { Exercise } from '../../src/content/schema'
import { beginSpeaking, dailyPlan, finishLesson, finishPlacement, importReport } from '../../src/domain/progress'
import { initialState } from '../../src/domain/state'
import type { Answer } from '../../src/domain/model'
import valid from '../../tests/fixtures/speaking-valid.json'
import invalid from '../../tests/fixtures/speaking-invalid.json'
import { createPrototype, session } from './mcp'

test('real Streamable HTTP client reads lesson context and stages only a validated report', async (t) => {
  const { server, readDraft } = createPrototype()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  assert(address && typeof address !== 'string')
  const url = new URL(`http://127.0.0.1:${address.port}/mcp`)
  const client = new Client({ name: 'local-feasibility-test', version: '1.0.0' })
  t.after(async () => { await client.close(); server.closeAllConnections(); server.close() })

  assert.equal((await fetch(url, { method: 'POST', headers: { Origin: 'https://outside.example' } })).status, 403)
  await client.connect(new StreamableHTTPClientTransport(url))
  const { tools } = await client.listTools()
  assert.deepEqual(tools.map(({ name, annotations }) => [name, annotations?.readOnlyHint]), [
    ['get_speaking_context', true], ['stage_speaking_report', false],
  ])
  const read = CallToolResultSchema.parse(await client.callTool({
    name: 'get_speaking_context', arguments: { sessionId: session.id },
  }))
  const lesson = catalog.en.unit.lessons[0]
  assert.equal(read.structuredContent?.sessionId, session.id)
  assert.equal(read.structuredContent?.language, 'en')
  assert.equal(read.structuredContent?.cefrTarget, 'B2+')
  assert.deepEqual(read.structuredContent?.objective, lesson.objective)
  assert.equal(read.structuredContent?.targetGrammar, lesson.speaking?.grammar)
  assert.deepEqual(read.structuredContent?.vocabulary, lesson.vocabulary.map(({ id, term }) => ({ id, term })))
  assert.match(String(read.structuredContent?.previousRecurringMistakes), /Synthetic example/)
  assert.match(String(read.structuredContent?.instructions), /Ask one question at a time/)

  const stage = async (report: unknown) => CallToolResultSchema.parse(await client.callTool({
    name: 'stage_speaking_report', arguments: { report },
  }))
  assert.equal((await stage(invalid)).isError, true)
  assert.equal((await stage({ ...valid, sessionId: '12345678-1234-4123-8123-123456789abc' })).isError, true)
  assert.equal(readDraft(), undefined)
  const report = { ...valid, successfulUses: [{ objectiveId: lesson.objective.id, evidenceId: 'q3' }],
    evidence: [...valid.evidence, { id: 'q3', quote: 'I have led several workshops.' }] }
  assert.equal((await stage(report)).structuredContent?.status, 'staged')
  assert.equal((await stage(report)).structuredContent?.status, 'already_staged')
  assert.equal((await stage({ ...report, confidence: 'low' })).isError, true)
  assert.deepEqual(readDraft(), report)

  const before = '2026-11-13T10:00:00.000Z'
  const after = '2026-11-13T10:15:00.000Z'
  const course = catalog.en
  const answer = (exercise: Exercise): Answer => {
    if (exercise.kind === 'open') return exercise.sample
    if (exercise.kind === 'fill' || exercise.kind === 'short') return exercise.accepted[0]
    return exercise.accepted
  }
  let state = initialState({ id: crypto.randomUUID(), language: 'en', estimate: 'B1', target: 'B2+',
    minutes: 60, goals: ['general'], days: [0, 1, 2, 3, 4, 5, 6] })
  state = finishPlacement(state, course, Object.fromEntries(course.placement.map(({ exercise }) => [exercise.id, answer(exercise)])), before)
  const exercises = [...lesson.concepts.map(({ variants }) => variants[0]), lesson.production]
  state = finishLesson(state, course, lesson, Object.fromEntries(exercises.map((exercise) => [exercise.id, answer(exercise)])), before)
  state = beginSpeaking(state, lesson, before, session.id)
  assert.equal(state.speakingAssessments.length, 0)
  const draft = readDraft()
  assert(draft)
  const imported = importReport(state, lesson, draft, after)
  assert.equal(imported.speakingAssessments[0].source, 'external_report')
  assert.equal(imported.reviews.find(({ cardId }) => cardId === report.vocabularyGaps[0].cardId)?.dueAt, after)
  assert.equal(dailyPlan(imported, course, after, 'Europe/Istanbul').kind, 'review')
})

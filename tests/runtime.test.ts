import { Capacitor } from '@capacitor/core'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { catalog } from '../src/content/catalog'
import { initialState } from '../src/domain/state'
import { buildTutorRequest } from '../src/domain/tutor'
import { Settings } from '../src/features/Settings'
import { InlineCoaching, LessonHelp, TutorSettings } from '../src/features/TutorPanel'
import { isLocalTutorAvailable } from '../src/runtime'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test.each([
  ['http://127.0.0.1:4173', false, true],
  ['http://127.0.0.1:4173', true, false],
  ['http://127.0.0.1:5173', false, false],
  ['https://127.0.0.1:4173', false, false],
  ['http://localhost:4173', false, false],
  ['https://localhost', true, false],
  ['https://example.com', false, false],
  ['null', false, false],
])('local tutor availability at %s (native: %s)', (origin, native, available) => {
  vi.stubGlobal('location', { origin })
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(native)
  expect(isLocalTutorAvailable()).toBe(available)
})

const lesson = catalog.en.unit.lessons[0]
const state = initialState({ id: '72752ef8-871a-4a80-8299-ccfeec0dc4e1', language: 'en',
  estimate: 'C1', target: 'B2', days: [1], goals: ['professional'], minutes: 30 })
const request = buildTutorRequest(state, lesson, 'explanation')

test.each([
  ['http://127.0.0.1:4173', true],
  ['https://example.com', false],
])('replaces account and AI actions with the mobile notice at %s (native: %s)', (origin, native) => {
  vi.stubGlobal('location', { origin })
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(native)
  const views = [
    createElement(TutorSettings),
    createElement(Settings, { state, busy: false, onSave: async () => true,
      onRestore: async () => true, notice: () => {} }),
    createElement(LessonHelp, { state, lesson }),
    createElement(InlineCoaching, { label: 'AI yardımı', request }),
    createElement(InlineCoaching, { label: 'AI yardımı', request, initiallyOpen: true }),
  ]
  for (const view of views) {
    const html = renderToStaticMarkup(view)
    expect(html).toContain('ChatGPT bağlantısı mobil uygulamada henüz yok.')
    expect(html).toContain('kopyala/yapıştır akışı çalışır.')
    expect(html).not.toContain('Continue with ChatGPT')
    expect(html).not.toContain('ChatGPT bağlantısı</h2>')
    expect(html).not.toContain('Başka şekilde açıkla')
    expect(html).not.toContain('Onayla ve gönder')
    expect(html).not.toContain('AI yardımı')
  }
})

test('keeps desktop account settings and lesson help on the canonical loopback server', () => {
  vi.stubGlobal('location', { origin: 'http://127.0.0.1:4173' })
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
  expect(renderToStaticMarkup(createElement(TutorSettings))).toContain('ChatGPT bağlantısı</h2>')
  expect(renderToStaticMarkup(createElement(LessonHelp, { state, lesson }))).toContain('Başka şekilde açıkla')
  expect(renderToStaticMarkup(createElement(InlineCoaching, { label: 'AI yardımı', request })))
    .toContain('AI yardımı</button>')
})

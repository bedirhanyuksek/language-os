import { useState } from 'react'
import type { Course, Lesson, VocabularyItem } from '../content/schema'
import { mapPlacement } from '../domain/assessment'
import { levelSchema, type ExerciseAttempt, type StudyPlan } from '../domain/model'
import { bridgeLesson, needsBridge } from '../domain/diagnostic'
import { isUnlocked, masteryFor } from '../domain/progress'
import type { LearningState } from '../domain/state'
import { languageLabels, phaseLabels, skillLabels } from './labels'

const statusLabels = {
  not_assessed: 'Başlanabilir', developing: 'Pratik gerekiyor', ready: 'Temel pratik tamam',
  retained: 'Gecikmeli aktarım gözlendi',
}

export function Curriculum({ course, state }: { course: Course; state: LearningState }) {
  return <div className="curriculum">
    {course.unit.lessons.filter((lesson) => lesson !== bridgeLesson(course) || needsBridge(course, state, lesson)).map((lesson, index) => {
      const eligible = levelSchema.options.indexOf(lesson.objective.level) <= levelSchema.options.indexOf(state.profile.target)
      const unlocked = eligible && isUnlocked(state, course, lesson)
      const status = masteryFor(state, lesson).status
      return <div className="curriculum-row" key={lesson.id}>
        <span className={`step-icon ${unlocked ? 'available' : ''}`} aria-hidden>{String(index + 1).padStart(2, '0')}</span>
        <div><strong>{lesson.title}</strong><small>{lesson.objective.level} · {lesson.objective.description}</small></div>
        <span className="status">{!eligible ? 'Hedef seviyenin üzerinde' : unlocked ? statusLabels[status] : 'Ön koşul bekliyor'}</span>
      </div>
    })}
  </div>
}

export function Dashboard({ state, course, plan, start }: {
  state: LearningState; course: Course; plan: StudyPlan; start: () => void
}) {
  const lesson = 'lessonId' in plan ? course.unit.lessons.find(({ id }) => id === plan.lessonId) : undefined
  const headline = plan.kind === 'pedagogy' ? phaseLabels[plan.phase] : {
    lesson: lesson?.title, practice: 'Hedefli pratik', speaking: 'Sesli pratik',
    review: 'Kelime tekrarı', out_of_scope: 'Hedef seviyende ders yok', rest: 'Dinlenme günü', budget: 'Bugünkü çalışma tamamlandı', complete: 'Başlangıç ünitesi tamamlandı',
  }[plan.kind]
  const action = { lesson: 'Derse başla', practice: 'Pratiğe başla', speaking: 'Konuşmayı hazırla', review: 'Kelimeleri tekrar et' }
  const date = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return <>
    <header className="page-heading"><div><p className="eyebrow">Çalışma alanı</p><h1>Bugünkü plan</h1></div><span className="date">{date}</span></header>
    <section className="plan-cover">
      <div>
        <p className="eyebrow">{languageLabels[course.language]} <span>·</span> {lesson?.objective.level ?? course.level}{'minutes' in plan && <> <span>·</span> {plan.minutes} dk</>}</p>
        <h2>{headline}</h2>
        {lesson && <p className="objective">{lesson.objective.description}</p>}
        <p className="plan-reason">{'minutes' in plan && <strong>Neden bu çalışma? </strong>}{plan.reason}</p>
        {'minutes' in plan && <button className="light-button" onClick={start}>{plan.kind === 'pedagogy' ? 'Çalışmayı aç' : action[plan.kind]} <span aria-hidden>↗</span></button>}
      </div>
      <div className="cover-type" aria-hidden="true" lang={course.language}>{course.language === 'en' ? 'Aa' : 'Яя'}</div>
    </section>
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">Yayımlanan dersler</p><h2>{course.unit.title}</h2></div></div>
      <p>{course.language === 'en' ? 'A2 temel desteği ile seçili B1 ve B2 kazanımları' : 'Kiril desteği ile seçili A1 ve A2 kazanımları'}. Bu rota tam bir CEFR programı değildir.</p>
      <Curriculum course={course} state={state} />
    </section>
  </>
}

export function LessonNotes({ lesson }: { lesson: Lesson }) {
  return <article className="surface notes">
    <h2>Önce hatırla</h2><p>{lesson.recall}</p>
    <h2>Kural ve kullanım</h2>
    {lesson.pedagogy ? lesson.pedagogy.sections.map(({ title, explanation, example }) => <section className="section" key={title}>
      <h3>{title}</h3><p>{explanation}</p><blockquote lang={lesson.pedagogy?.language}>{example}</blockquote>
    </section>) : lesson.explanation.map((line) => <p key={line}>{line}</p>)}
    {lesson.examples.map((example) => <div className="example" key={example.correct}>
      <p><strong>Doğru</strong> {example.correct}</p>
      <p><strong>Düzelt</strong> <s>{example.incorrect}</s></p>
      <p>{example.note}</p>
    </div>)}
  </article>
}

export function LessonResults({ lesson, attempts, onContinue }: {
  lesson: Lesson; attempts: ExerciseAttempt[]; onContinue: () => void
}) {
  const exercises = [...lesson.concepts.flatMap(({ variants }) => variants), lesson.production]
  const correct = attempts.filter(({ evidence }) => evidence.outcome === 'correct').length
  const scored = attempts.filter(({ evidence }) => evidence.source === 'deterministic').length
  return <>
    <header className="page-heading"><div><p className="eyebrow">{lesson.title}</p><h1>Ders sonucu</h1>
      <p>{correct} / {scored} kesin yanıt doğru</p></div></header>
    <div className="feedback-list">{attempts.map((attempt) => {
      const exercise = exercises.find(({ id }) => id === attempt.exerciseId)
      if (!exercise) return null
      const { outcome } = attempt.evidence
      return <article className="surface feedback" key={attempt.id}>
        <span className={`status ${outcome}`}>{outcome === 'correct' ? 'Doğru' : outcome === 'incorrect' ? 'Tekrar çalışılacak' : 'İnceleme bekliyor'}</span>
        <h2>{exercise.prompt}</h2>
        <p><strong>Yanıtın</strong> {Array.isArray(attempt.answer) ? attempt.answer.join(' · ') : attempt.answer}</p>
        {exercise.kind === 'open' && <p><strong>Örnek yanıt</strong> {exercise.sample}</p>}
        {outcome === 'incorrect' && exercise.kind !== 'open' && <p><strong>Beklenen yanıt</strong> {
          Array.isArray(exercise.accepted) ? exercise.accepted.join(exercise.kind === 'fill' || exercise.kind === 'short' ? ' / ' : ' · ') : exercise.accepted}</p>}
        <p>{exercise.explanation}</p>
        {outcome === 'incorrect' && lesson.pedagogy?.checks.filter(({ conceptId }) => conceptId === attempt.conceptId)
          .map((check) => <p key={check.conceptId}><strong>{check.misconception}</strong> <s>{check.incorrectExample}</s> → {check.correctExample}</p>)}
        {exercise.kind === 'open' && lesson.pedagogy && <ul>{lesson.pedagogy.rubric.map(({ criterion, example }) =>
          <li key={criterion}>{criterion} · {example}</li>)}</ul>}
      </article>
    })}</div>
    <button className="primary" onClick={onContinue}>Günlük plana dön <span aria-hidden>→</span></button>
  </>
}

export function ReviewCard({ card, index, total, busy, onRate }: {
  card: VocabularyItem; index: number; total: number; busy: boolean
  onRate: (result: 'again' | 'remembered') => Promise<void>
}) {
  const [revealed, setRevealed] = useState(false)
  return <article className="surface review-card">
    <p className="eyebrow">Kart {index + 1} / {total} · {card.partOfSpeech}</p>
    <h2>{card.term}</h2>
    {!revealed ? <button className="primary" onClick={() => setRevealed(true)}>Anlamı göster</button> : <>
      <p className="meaning">{card.meaning}</p>
      <blockquote>{card.example}</blockquote>
      <p>{card.context} · {card.grammar}</p>
      {card.pronunciation && <p>{card.pronunciation}</p>}
      <div className="button-row">
        <button className="secondary" disabled={busy} onClick={() => void onRate('again')}>Tekrar çalış</button>
        <button className="primary" disabled={busy} onClick={() => void onRate('remembered')}>Hatırladım</button>
      </div>
    </>}
  </article>
}

export function SkillProfile({ state, course }: { state: LearningState; course: Course }) {
  return <>
    <header className="page-heading"><div><p className="eyebrow">{languageLabels[state.profile.language]}</p>
      <h1>Beceri profili</h1><p>Başlangıç örnekleri. Kendi seviye tahminin ölçüm sonucuna katılmaz.</p></div></header>
    <div className="skill-grid">{mapPlacement(state.attempts).map((item) => <article className="surface skill-card" key={item.skill}>
      <h2>{skillLabels[item.skill]}</h2><p>{
        item.status === 'sampled' ? `${item.correct} / ${item.total} doğru · Düşük güven` :
          item.status === 'review_required' ? 'Yazılı örnek inceleme bekliyor' : 'Ölçülmedi'
      }</p>
    </article>)}</div>
    {course.placement.filter(({ exercise }) => exercise.kind === 'open').map(({ exercise }) => {
      if (exercise.kind !== 'open') return null
      const answer = state.attempts.find(({ exerciseId }) => exerciseId === exercise.id)?.answer
      if (!answer) return null
      return <article className="surface feedback" key={exercise.id}>
        <h2>Yazılı üretim örneği</h2><p><strong>Yanıtın</strong> {answer}</p>
        <p><strong>Örnek yanıt</strong> {exercise.sample}</p><p>{exercise.explanation}</p>
      </article>
    })}
    <section className="section">
      <h2>Uygulamada toplanan kanıtlar</h2>
      <div className="skill-grid">{(['reading', 'listening', 'vocabulary'] as const).map((skill) => {
        const samples = state.attempts.filter((item) => item.context !== 'placement' && item.context !== 'diagnostic' && item.evidence.skill === skill)
        const scored = samples.filter(({ evidence }) => evidence.source === 'deterministic')
        const taught = samples.filter(({ context }) => context === 'vocabulary')
        return <article className="surface skill-card" key={skill}><h3>{skillLabels[skill]}</h3>
          <p>{scored.length ? `${scored.filter(({ evidence }) => evidence.outcome === 'correct').length} / ${scored.length} kesin yanıt doğru` : 'Henüz ölçülmedi'}</p>
          {skill === 'vocabulary' && <p>Tanıma {taught.filter(({ evidence }) => evidence.observation === 'recognition' && evidence.outcome === 'correct').length} ·
            Aktif hatırlama {taught.filter(({ evidence }) => evidence.observation === 'controlled_production' && evidence.outcome === 'correct').length} ·
            İnceleme bekleyen kullanım {taught.filter(({ evidence }) => evidence.outcome === 'review_required').length}</p>}
        </article>
      })}</div>
      {state.reviewHistory.length > 0 && <details><summary>Kelime tekrar geçmişi</summary><ul>
        {[...state.reviewHistory].reverse().map(({ cardId, at, result, mode }, index) => <li key={index}>
          {course.unit.lessons.flatMap(({ vocabulary }) => vocabulary).find(({ id }) => id === cardId)?.term} ·
          {' '}{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(at))} ·
          {' '}{result === 'remembered' ? 'Hatırlandı' : 'Tekrar gerekiyor'} · {mode === 'typed' ? 'Yazılı hatırlama' : 'Öz bildirim'}
        </li>)}
      </ul></details>}
    </section>
    <section className="section">
      <h2>Derslerde toplanan kanıtlar</h2>
      <div className="curriculum">{course.unit.lessons.map((lesson) => {
        const { observations } = masteryFor(state, lesson)
        const attempts = state.attempts.filter((item) => item.lessonId === lesson.id && item.context !== 'diagnostic')
        const comparison = lesson.pedagogy?.checks.flatMap(({ conceptId, transfer, delayed }) => {
          const first = attempts.find((item) => transfer.some(({ id }) => id === item.exerciseId))
          const latest = attempts.filter((item) => delayed.some(({ id }) => id === item.exerciseId)).at(-1)
          const concept = lesson.concepts.find(({ id }) => id === conceptId)
          return first && latest && concept ? [{ concept, first, latest }] : []
        }) ?? []
        const date = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' }).format(new Date(value))
        return <div className="curriculum-row" key={lesson.id}>
          <div><strong>{lesson.title}</strong>
            <small>{Object.keys(observations).length ? [
              ['Tanıma', observations.recognition], ['Kontrollü üretim', observations.controlled_production],
              ['Serbest yazı örneği', observations.free_production], ['Gecikmeli hatırlama', observations.retention],
              ['Dış konuşma raporu', observations.speaking_application],
              ['Bağımsız sözlü kullanım', observations.speaking_independent],
            ].filter(([, count]) => count).map(([label, count]) => `${label}: ${count}`).join(' · ') : 'Henüz gözlem yok'}</small>
            {comparison.length > 0 && <details><summary>İlk ve gecikmeli denemeyi karşılaştır</summary>
              {comparison.map(({ concept, first, latest }) => <p key={concept.id}>
                <strong>{concept.label}</strong><br />
                {date(first.at)} · Yeni bağlam: {String(first.answer)} ({first.evidence.outcome === 'correct' ? 'doğru' : 'yanlış'})<br />
                {date(latest.at)} · Gecikmeli görev: {String(latest.answer)} ({latest.evidence.outcome === 'correct' ? 'doğru' : 'yanlış'})
              </p>)}
            </details>}
          </div>
        </div>
      })}</div>
    </section>
  </>
}

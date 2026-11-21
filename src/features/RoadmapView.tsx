import { useMemo } from 'react'
import type { Course } from '../content/schema'
import type { StudyPlan } from '../domain/model'
import { buildRoadmap, type RoadmapEstimate, type RoadmapLesson, type RoadmapStatus } from '../domain/roadmap'
import type { LearningState } from '../domain/state'
import { languageLabels } from './labels'

const statusLabels: Record<RoadmapStatus, string> = {
  completed: 'tamamlandı', in_progress: 'devam ediyor', upcoming: 'sıradaki', locked: 'kilitli',
}

export function RoadmapView({ state, course, plan }: { state: LearningState; course: Course; plan: StudyPlan }) {
  const focusLessonId = 'lessonId' in plan ? plan.lessonId : undefined
  const roadmap = useMemo(() => buildRoadmap(state, course, focusLessonId), [state, course, focusLessonId])
  return <div className="roadmap">
    <header className="page-heading"><div>
      <p className="eyebrow">{languageLabels[course.language]} · Hedefin {state.profile.target}</p>
      <h1>Yol haritam</h1>
      <p>Bulunduğun dersi, sonraki konuları ve çalışma hızına göre tahmini rotanı gör.</p>
    </div></header>
    <section className="roadmap-position surface" aria-label="Rotadaki yerin">
      <div><h2>Şu anki dersin</h2><p>{roadmap.current?.title ?? 'Yayımlanan rotada başlanabilecek yeni ders yok.'}</p></div>
      <div><h2>Sonraki adımın</h2><p>{roadmap.next?.title ?? 'Yayımlanan rotada sırada başka ders yok.'}</p>
        {roadmap.next?.status === 'locked' && <p className="roadmap-note">Ön koşullar tamamlandığında açılacak.</p>}
      </div>
    </section>
    <section className="section" aria-labelledby="roadmap-pace">
      <h2 id="roadmap-pace">Çalışma hızına göre</h2>
      <p>Günde {state.profile.minutes} dk × haftada {roadmap.studyDays} seçili çalışma günü = {roadmap.weeklyMinutes} dk/hafta.</p>
      <p className="roadmap-note">Bu tahmin bugünden başlayan çalışma haftaları içindir. Ders sürelerinden kaydedilen çalışma dakikaları çıkarılır;
        bitmemiş her derse en az 1 dk ayrılır. Ön koşulları sırayla tamamladığın varsayılır. Tekrarlar, onarım çalışmaları ve gecikmeli
        kontrollerin bekleme süresi bu hesaba dahil değildir; ilerledikçe tahmin değişebilir.</p>
      <div className="roadmap-estimates">
        <Estimate title="Bu hafta" estimate={roadmap.week} byId={roadmap.byId} />
        <Estimate title="Önümüzdeki 4 hafta" estimate={roadmap.fourWeeks} byId={roadmap.byId} />
      </div>
    </section>
    <section className="section" aria-labelledby="roadmap-levels">
      <h2 id="roadmap-levels">Seviyeler ve konular</h2>
      <p className="roadmap-note">“Tamamlandı”, mevcut kazanım kontrollerini geçtiğini gösterir. Tekrarlar ve diğer beceri çalışmaları sürebilir.
        Yayımlanan dersleri bitirmek, CEFR seviyesinin tamamını kazandığın anlamına gelmez.</p>
      {roadmap.levels.map((level) => <details className="roadmap-level" key={`${state.profile.id}:${level.level}`}
        open={level.level === roadmap.current?.level}>
        <summary><span className="roadmap-band">{level.level}</span><span>{level.published
          ? `${level.completed}/${level.published} ders tamamlandı` : 'henüz yayımlanmadı'}</span></summary>
        {level.published === 0 && <p className="roadmap-note">Bu seviyede ders henüz yayımlanmadı.</p>}
        {level.topics.map((topic) => <section className="roadmap-topic" key={topic.id} aria-label={topic.title}>
          <h3>{topic.title}</h3>
          {topic.lessons.length === 0 ? <p className="roadmap-note">henüz yayımlanmadı</p> : <ol className="roadmap-lessons">
            {topic.lessons.map((lesson) => <li key={lesson.id} className={`roadmap-lesson roadmap-${lesson.status}`}
              aria-current={lesson.id === roadmap.current?.id ? 'step' : undefined}>
              <div className="roadmap-markers">
                {lesson.id === roadmap.current?.id && <span className="roadmap-here">Buradasın</span>}
                {lesson.id === roadmap.next?.id && <span className="roadmap-next">Sıradaki ders</span>}
              </div>
              <p className="roadmap-title">{lesson.title}</p>
              <p className="roadmap-lesson-meta"><span>{statusLabels[lesson.status]}</span>
                <span>{lesson.remainingMinutes ? `Yaklaşık ${lesson.remainingMinutes} dk kaldı` : 'Kazanım kontrolü tamamlandı'}</span></p>
              {lesson.status === 'locked' && <p className="roadmap-note">Önce: {lesson.prerequisiteTitles.join(', ')}</p>}
            </li>)}
          </ol>}
        </section>)}
      </details>)}
    </section>
  </div>
}

function Estimate({ title, estimate, byId }: { title: string; estimate: RoadmapEstimate; byId: Map<string, RoadmapLesson> }) {
  return <article className="surface roadmap-estimate">
    <h3>{title}</h3><p className="roadmap-capacity">{estimate.budgetMinutes} dk</p>
    <p>{estimate.lessonIds.length} dersin kalan çalışması bu süreye sığıyor.</p>
    {estimate.lessonIds.length > 0 && <details><summary>Tahmini ders sırası</summary>
      <ol>{estimate.lessonIds.map((id) => <li key={id}>{byId.get(id)!.title}</li>)}</ol>
    </details>}
    {estimate.partial && <p className="roadmap-note">Ayrıca “{byId.get(estimate.partial.lessonId)!.title}” dersine {estimate.partial.minutes} dk ayırabilirsin;
      kalan çalışma sonraki haftaya taşınır.</p>}
    {estimate.usedMinutes < estimate.budgetMinutes && <p className="roadmap-note">Hedefine kadar yayımlanan dersler için kalan çalışma {estimate.usedMinutes} dk.
      Artan zamanı tekrarlar için kullanabilirsin.</p>}
  </article>
}

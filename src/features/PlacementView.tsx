import type { AssessmentItem } from '../content/assessment/bank'
import type { Answer, Language } from '../domain/model'
import type { PlacementResponse } from '../domain/placement-state'
import { AudioPlayer } from './AudioPlayer'
import { ExerciseForm } from './ExerciseForm'
import { skillLabels } from './labels'
import { useStudySession } from './study-session-context'

export function PlacementView({ item, language, busy, mini, submit, leave, startLearning }: {
  item: AssessmentItem
  language: Language
  busy: boolean
  mini: boolean
  submit: (status: PlacementResponse, answer?: Answer, audioPlayed?: boolean, transcript?: boolean) => Promise<boolean>
  leave: () => void
  startLearning?: () => void
}) {
  const { draft, change } = useStudySession()
  const transcriptOpen = Boolean(draft.supports.transcript)
  const ready = !item.transcript || draft.plays > 0 || transcriptOpen
  return <>
    <header className="page-heading"><div>
      <p className="eyebrow">{skillLabels[item.skill]} · {item.focus}</p>
      <h1>{mini ? 'Başlangıç taraması' : 'Ek değerlendirme'}</h1>
      <p>{mini ? 'Kısa örnekler ilk dersini seçmeye yardımcı olur.' : 'Bu örnek, sıradaki çalışmalara yön vermek için ilgili beceriyi ayrı inceler.'}</p>
    </div></header>
    {item.passage && <blockquote lang={language} className="surface passage">{item.passage}</blockquote>}
    {item.transcript && <section className="surface section">
      <p>Önce kaydı dinle. İstersen metinle çalış; bu, sesli ölçümden ayrı kaydedilir.</p>
      <AudioPlayer
        audio={{ kind: 'recording', src: `/audio/${item.id}.mp3`, synthetic: true, locale: language === 'en' ? 'en-US' : 'ru-RU',
          license: 'MIT', source: 'https://github.com/espeak-ng/espeak-ng' }}
        text={item.transcript} label="Değerlendirme sesini dinle"
        onEnd={() => change({ plays: draft.plays + 1 })}
        onUnavailable={() => change({ supports: { audioUnavailable: true } })} />
      {!transcriptOpen && <button className="secondary" onClick={() => change({ supports: { transcript: true } })}>
        Metinle çalış
      </button>}
      {transcriptOpen && <blockquote lang={language}>{item.transcript}</blockquote>}
    </section>}
    {item.exercise && ready && <section className="section">
      <ExerciseForm tasks={[{ exercise: item.exercise, conceptId: item.family, label: skillLabels[item.skill] }]}
        language={language} busy={busy} submitLabel="Yanıtı kaydet"
        onSubmit={(answers) => submit('answered', answers[item.id], draft.plays > 0, transcriptOpen)} />
    </section>}
    {item.spokenPrompt && <section className="surface section">
      <p>{item.spokenPrompt}</p>
      <p>Bu prova puanlanmaz. Ders sonrasında Speaking Coach ile kullanıcı onaylı bir rapor ekleyebilirsin.</p>
      <button className="secondary" disabled={busy} onClick={() => void submit('practiced')}>Sesli prova yaptım</button>
    </section>}
    <div className="button-row">
      {item.exercise && <button className="link-button" disabled={busy} onClick={() => void submit('unknown')}>Bilmiyorum</button>}
      <button className="link-button" disabled={busy} onClick={() => void submit('skipped')}>Şimdilik geç</button>
      {item.transcript && <button className="link-button" disabled={busy} onClick={() => void submit('unavailable')}>Ses erişilemiyor</button>}
      <button className="link-button" disabled={busy} onClick={leave}>Daha sonra devam et</button>
      {startLearning && <button className="secondary" disabled={busy} onClick={startLearning}>{mini ? 'Öğretime geç' : 'Bu taramayı bitir'}</button>}
    </div>
  </>
}

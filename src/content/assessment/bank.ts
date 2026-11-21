import type { CEFRLevel, Language, Skill } from '../../domain/model'
import type { Exercise } from '../schema'

export const assessmentBankVersion = 1
export type Route = 'en-start' | 'en-b1' | 'en-advanced' | 'ru-start' | 'ru-a2'
type Level = Extract<CEFRLevel, 'A1' | 'A2' | 'B1' | 'B2' | 'C1'>
export type AssessmentItem = {
  route: Route
  band: Level
  family: string
  focus: string
  stage: 'mini' | 'followup'
  lesson: string
  skill: Skill
  id: string
  exercise?: Extract<Exercise, { kind: 'single' | 'fill' | 'short' | 'open' }>
  passage?: string
  transcript?: string
  spokenPrompt?: string
}

function question(route: Route, band: Level, stage: AssessmentItem['stage'], id: string, family: string, focus: string,
  lesson: string, skill: Skill, prompt: string, options: [string, string, string], correct: 0 | 1 | 2,
  material?: Pick<AssessmentItem, 'passage' | 'transcript'>): AssessmentItem {
  return { route, band, family, focus, stage, lesson, skill, id,
    exercise: { id, kind: 'single', skill, prompt, options, accepted: options[correct], explanation: focus }, ...material }
}

function recall(route: Route, band: Level, stage: AssessmentItem['stage'], id: string, family: string,
  focus: string, lesson: string, skill: Skill, prompt: string, accepted: string[]): AssessmentItem {
  return { route, band, stage, id, family, focus, lesson, skill,
    exercise: { id, kind: 'short', skill, prompt, accepted, explanation: focus } }
}

function production(route: Route, band: Level, id: string, lesson: string, prompt: string): AssessmentItem[] {
  return [
    { route, band, stage: 'followup', id: `${id}.write`, family: 'writing', focus: 'Yeni durumda açık yazı', lesson, skill: 'writing',
      exercise: { id: `${id}.write`, kind: 'open', skill: 'writing', prompt, sample: 'İnceleme bekleyen yazı.', explanation: 'Yazı örneği inceleme bekliyor.' } },
    { route, band, stage: 'followup', id: `${id}.speak`, family: 'speaking', focus: 'Takip sorusuyla isteğe bağlı sözlü örnek',
      lesson, skill: 'speaking', spokenPrompt: route.startsWith('ru-') ? 'Yeni birine adını söyle ve adını sor. Sana nerede yaşadığını sorarsa örnek cümleye bakmadan yanıtla.' :
        route === 'en-advanced' ? 'Bir pilotun neden hemen genişletilmemesi gerektiğini sözlü açıkla. Muhatap kanıtın yetersizliğini sorarsa yanıtla.' :
          'Daha önce yaptığın bir işi sesli anlat. Birisi “When did that happen?” diye sorarsa örnek cümleye bakmadan yanıtla.' },
  ]
}

const englishBeginner = [
  question('en-start', 'A1', 'mini', 'en.assess.start.g1', 'basic-forms', 'Tanışmada kişi ve fiil', 'en.identity', 'grammar',
    'My name ___ Jess.', ['are', 'is', 'am'], 1),
  question('en-start', 'A1', 'mini', 'en.assess.start.r1', 'basic-reading', 'Kısa mesajda yer', 'en.identity', 'reading',
    'Where will Pat wait?', ['Outside the library', 'At the station', 'Inside the café'], 0,
    { passage: 'Hi Sam. The café is closed. I’m at the library. I’ll wait outside. Pat' }),
  recall('en-start', 'A1', 'followup', 'en.assess.start.v1', 'basic-places', 'Yer adını hatırlama', 'en.identity', 'vocabulary',
    'İnsanların tren beklediği yeri bir İngilizce sözcükle yaz.', ['station']),
  ...production('en-start', 'A1', 'en.assess.start', 'en.identity', 'Yeni sınıf arkadaşına adını ve yaşadığın şehri söyleyen iki kısa İngilizce cümle yaz.'),
]

const englishIntermediate = [
  question('en-b1', 'B1', 'mini', 'en.assess.b1.g1', 'time-reference', 'Bitmiş zaman ve deneyim ayrımı', 'en.experience', 'grammar',
    'The interview was last Tuesday. Which message fits the timing?', ['I have met the manager last Tuesday.', 'I meet the manager last Tuesday.', 'I met the manager last Tuesday.'], 2),
  recall('en-b1', 'B1', 'mini', 'en.assess.b1.v1', 'work-collocations', 'İş deneyiminde kalıp hatırlama', 'en.experience', 'vocabulary',
    'Bir sunum yaptığını söyle. I ___ a presentation yesterday. Boşluğa tek fiil yaz.', ['gave', 'delivered', 'did', 'made']),
  question('en-b1', 'B1', 'mini', 'en.assess.b1.l1', 'message-purpose', 'Sözlü mesajın ana amacı', 'en.experience', 'listening',
    'Why is Alex calling?', ['To change the collection time', 'To ask for a refund', 'To cancel the order'], 0,
    { transcript: 'Hi, this is Alex from the cycle shop. Your bike is ready. The shop opens at nine tomorrow, but the mechanic wants to check the brakes once more. Could you pick it up after lunch instead? There is no extra charge.' }),
  question('en-b1', 'B1', 'mini', 'en.assess.b1.r1', 'practical-reading', 'Duyuruda eylem ve ayrıntı', 'en.experience', 'reading',
    'What must a volunteer who cannot come on Thursday do?', ['Pay for the session', 'Reply before Wednesday evening', 'Turn up without booking'], 1,
    { passage: 'Volunteer notice. Thursday’s induction is now in Room 4. Bring your ID. If you cannot attend, email us by 6 p.m. on Wednesday so that we can offer your place to someone else.' }),
  question('en-b1', 'A2', 'mini', 'en.assess.b1.r-foundation', 'practical-reading', 'Kısa mesajda yer değişikliği', 'en.experience', 'reading',
    'Where will Eva wait for Dan?', ['By the café', 'At the bus stop', 'Inside the station'], 0,
    { passage: 'Dan, the bus stop is busy today. Let’s meet by the café across the road at six. I’ll wait there. Eva' }),
  question('en-b1', 'B1', 'followup', 'en.assess.b1.g3', 'time-reference', 'Yeni bağlamda zaman gönderimi', 'en.experience', 'grammar',
    'The exhibition ended in April. Which sentence gives a finished event in its own time?', ['I helped at the exhibition in March.', 'I have helped at the exhibition in March.', 'I am helping at the exhibition last March.'], 0),
  question('en-b1', 'B1', 'followup', 'en.assess.b1.g4', 'time-reference', 'Bağımsız bir soruda zaman gönderimi', 'en.experience', 'grammar',
    'Yesterday’s ferry was cancelled. Which update fits that finished event?', ['They have booked a bus yesterday.', 'They booked a bus yesterday.', 'They are booking a bus yesterday.'], 1),
  recall('en-b1', 'B1', 'followup', 'en.assess.b1.g2', 'experience-construction', 'Tarihi belirtilmeyen deneyimi kurma', 'en.experience', 'grammar',
    'Write the verb group for a current interview: (work) “Before this interview, I ___ with customers in two countries.” Use the present perfect.', ['have worked']),
  question('en-b1', 'B1', 'followup', 'en.assess.b1.v2', 'work-meaning', 'Kalıbı farklı iş bağlamında ayırt etme', 'en.experience', 'vocabulary',
    'A note says “Mia takes minutes at the monthly meeting.” What does Mia do?', ['Checks how long each person speaks', 'Keeps the written record of the meeting', 'Arrives several minutes early'], 1),
  question('en-b1', 'B1', 'followup', 'en.assess.b1.l2', 'message-purpose', 'Yeni sesli mesajın ana amacı', 'en.experience', 'listening',
    'What does the speaker want listeners to do?', ['Pay at the front desk', 'Leave their bags outside', 'Use another entrance'], 2,
    { transcript: 'A quick message for anyone coming to the rehearsal. The main doors are locked while the floor is being repaired. Walk around to the entrance beside the car park. We are starting at the usual time, and you can leave your bag in the hall as normal.' }),
  question('en-b1', 'B2', 'followup', 'en.assess.b1.l3', 'message-purpose', 'Dolaylı talep ve koşulu ayırma', 'en.experience', 'listening',
    'What does Priya want the team to decide today?', ['Whether to move every appointment now', 'Who can cover the existing afternoon sessions', 'Whether to cancel the afternoon programme'], 1,
    { transcript: 'The survey makes a good case for morning appointments, but changing the whole timetable this week would leave nobody at the afternoon desk. Before we move anything, could we settle who is able to keep that desk open? We can come back to the proposed change on Friday.' }),
  question('en-b1', 'B1', 'followup', 'en.assess.b1.r2', 'cause-inference', 'Kısa iş kaydında neden çıkarımı', 'en.experience', 'reading',
    'Why is the mentor likely to miss the first session?', ['She needs a new ticket.', 'The session was cancelled.', 'She won’t be able to enter the building in time.'], 2,
    { passage: '9.00 First session, Room B. 9.15 Security desk opens. The mentor’s pass expired yesterday. Staff cannot issue a temporary pass before the security desk opens.' }),
  ...production('en-b1', 'B1', 'en.assess.b1', 'en.experience', 'Yeni bir gönüllü koordinatörüne, daha önce yaptığın bir işi ve ne zaman gerçekleşen bir ayrıntıyı anlatan 3–4 İngilizce cümle yaz.'),
]

const englishAdvanced = [
  question('en-advanced', 'B2', 'mini', 'en.assess.adv.r1', 'source-limits', 'İki kaynakta çıkarımın sınırı', 'en.evidence', 'reading',
    'Which conclusion is best supported?', ['Noise caused fewer complaints.', 'Noise was measured more accurately after May.', 'The decline in written complaints does not identify what happened to noise.'], 2,
    { passage: 'They recorded 14 fewer written complaints after May. The site manager credits the barrier. The community liaison notes that the online form was unavailable on four weekends after May and noise levels were not measured at the site.' }),
  question('en-advanced', 'B2', 'mini', 'en.assess.adv.g1', 'qualification', 'Kip ve kanıtın kesinlik düzeyi', 'en.evidence', 'grammar',
    'Low response makes the result uncertain. Choose the conclusion that preserves this limitation.', ['The result must reflect everyone’s experience.', 'The result may reflect the views of those who responded.', 'The result would have reflected no one’s experience.'], 1),
  question('en-advanced', 'B2', 'mini', 'en.assess.adv.v1', 'precision', 'Bağlamda iddia kalıbı', 'en.evidence', 'vocabulary',
    '“The findings warrant a closer look” suggests that the findings…', ['justify more investigation', 'make the decision final', 'reproduce another study'], 0),
  question('en-advanced', 'B2', 'mini', 'en.assess.adv.l1', 'speaker-stance', 'Konuşmacının çekincesi', 'en.evidence', 'listening',
    'What makes the speaker reluctant to endorse the recommendation?', ['The team reviewed too many sites.', 'The review did not include overnight cases.', 'The analyst made no recommendation.'], 1,
    { transcript: 'The analyst has suggested extending the trial. I can see why: the two sites reported shorter waits. What worries me is that the review stops at six in the evening. We don’t know what happens overnight. I’m happy to keep the trial running while we collect that information, but I wouldn’t extend it yet.' }),
  question('en-advanced', 'B2', 'followup', 'en.assess.adv.r2', 'source-limits', 'Başka kaynakta örneklem sınırı', 'en.evidence', 'reading',
    'Which comparison is justified?', ['Ratings rose for all students.', 'Ratings rose among the survey respondents.', 'The workshop caused students to complete more courses.'], 1,
    { passage: 'The subject committee reports higher satisfaction after introducing workshops. The survey appendix says the first sample included all tutorial groups. For the second survey, only students who attended a workshop received an invitation. The report does not give completion figures.' }),
  question('en-advanced', 'B2', 'followup', 'en.assess.adv.r4', 'source-limits', 'Bağımsız bir metinde nedensellik sınırı', 'en.evidence', 'reading',
    'What can readers infer about the new poster?', ['It might have helped, but the report cannot separate its effect from the discount.', 'The poster lowered the ticket price.', 'The discount left ticket sales unchanged.'], 0,
    { passage: 'An arts centre says attendance rose after a new poster campaign. Its box office reports that a weekday discount began in the same week. The centre collected no attendance data for a venue with only one of these changes.' }),
  question('en-advanced', 'C1', 'followup', 'en.assess.adv.r3', 'source-limits', 'Çelişen veri ve ikinci açıklama', 'en.evidence', 'reading',
    'Which distinction best reconciles the two sources?', ['The authors disagree on whether telephone support existed.', 'The survey and the audit measured the same households.', 'Take-up among invited households can rise while overall access falls.'], 2,
    { passage: 'The evaluation cites a rise from 30 to 41 percent in take-up among households invited to apply. A parallel audit finds that two districts stopped sending invitations after the pilot started and that applications submitted by telephone were excluded. Both teams used accurate denominators for the questions they asked.' }),
  question('en-advanced', 'B2', 'followup', 'en.assess.adv.g2', 'qualification', 'Koşulu ve olasılığı ayrı tutma', 'en.evidence', 'grammar',
    'The board is still waiting for an inspection. Which announcement avoids a promise?', ['The wing may reopen, provided it passes inspection.', 'The wing is reopening, although no inspection is planned.', 'The wing would have opened if it had already passed inspection.'], 0),
  recall('en-advanced', 'B2', 'followup', 'en.assess.adv.v2', 'precision-recall', 'Kalıbı bağımsız hatırlama', 'en.evidence', 'vocabulary',
    'Complete the set phrase meaning “while allowing for the limits of the estimate”: take the estimate with a ___ of salt.', ['pinch', 'grain']),
  question('en-advanced', 'B2', 'followup', 'en.assess.adv.l2', 'speaker-stance', 'Yeni kayıtta öne sürülen koşul', 'en.evidence', 'listening',
    'What does the speaker propose?', ['Continue the pilot and test an excluded group', 'Treat the current responses as final', 'Stop collecting information'], 0,
    { transcript: 'The pilot got useful responses from the people who booked online. That tells us rather less about the people who never got to the booking page. Let’s keep one site open and invite that group to try a different booking method. We can then decide whether the first result holds.' }),
  ...production('en-advanced', 'C1', 'en.assess.adv', 'en.evidence',
    'At one library the number of late returns fell after a reminder. Another library changed its opening hours at the same time and recorded no change. Write a short recommendation to a council. Keep observation and explanation separate.'),
]

const russian = [
  question('ru-start', 'A1', 'mini', 'ru.assess.a1.r1', 'cyrillic', 'Kiril harfleriyle tabela okuma', 'ru.cyrillic', 'reading',
    'Metro girişini arıyorsun. Hangi tabelayı izlersin?', ['МУЗЕЙ', 'МЕТРО', 'КАССА'], 1, { passage: 'МУЗЕЙ · МЕТРО · КАССА' }),
  question('ru-start', 'A1', 'mini', 'ru.assess.a1.g1', 'introduction', 'Selamlaşmada zamir ve hâl', 'ru.intro', 'grammar',
    '— Как вас зовут? — ___ зовут Оля.', ['Мне', 'Я', 'Меня'], 2),
  question('ru-start', 'A1', 'mini', 'ru.assess.a1.l1', 'spoken-identity', 'Temel konuşmada kişi adı', 'ru.intro', 'listening',
    'Bilet kimin için?', ['Дима', 'Нина', 'Анна'], 0,
    { transcript: 'Здравствуйте! Меня зовут Нина. А это Дима. Билет для Димы. Спасибо.' }),
  question('ru-start', 'A1', 'followup', 'ru.assess.a1.r2', 'cyrillic', 'Yeni Kiril yazısında aynı kişiyi bulma', 'ru.cyrillic', 'reading',
    'Нина adına ayrılan pakette ne yazıyor?', ['РОМАН', 'НАТАША', 'НИНА'], 2, { passage: 'Посылки. Имена на этикетках: РОМАН · НИНА · НАТАША' }),
  question('ru-start', 'A1', 'followup', 'ru.assess.a1.v1', 'service-words', 'Gündelik bir mekân sözcüğü', 'ru.intro', 'vocabulary',
    '«Билет можно купить в кассе.» Burada «касса» ne işe yarıyor?', ['Para çekilir.', 'Bilet alınır.', 'Bagaj teslim edilir.'], 1),
  recall('ru-start', 'A1', 'followup', 'ru.assess.a1.g2', 'introduction-construction', 'Yeni tanışmada kalıp kurma', 'ru.intro', 'grammar',
    '— Как тебя зовут? — ___ зовут Миша. Yalnızca eksik sözcüğü yaz.', ['меня']),
  question('ru-start', 'A1', 'followup', 'ru.assess.a1.l2', 'spoken-identity', 'Farklı konuşmada kişi adı', 'ru.intro', 'listening',
    'Мария’nın yanında kim var?', ['Иван', 'Павел', 'Олег'], 1,
    { transcript: 'Доброе утро. Я Мария. Со мной Павел. Иван ещё дома. Мы ждём автобус.' }),
  question('ru-start', 'A2', 'followup', 'ru.assess.a1.l3', 'spoken-identity', 'Değişen plan ve sorumlu kişi', 'ru.intro', 'listening',
    'Biletleri istasyona kim götürecek?', ['Олег', 'Лена', 'Саша'], 2,
    { transcript: 'Лена не сможет поехать на вокзал: у неё встреча. У Олега нет билетов. Саша заедет к Лене после работы и привезёт билеты на вокзал.' }),
  ...production('ru-start', 'A1', 'ru.assess.a1', 'ru.intro', 'Yeni komşuna Rusça kısa bir selam yaz. Adını söyle ve onun adını sor.'),
  question('ru-a2', 'A2', 'mini', 'ru.assess.a2.g1', 'case-goal', 'Hareket yönünde hâl', 'ru.intro', 'grammar',
    '«Завтра я иду …, чтобы купить подарок.» Hangi ifade uygun?', ['в магазине', 'в магазин', 'из магазина'], 1),
  question('ru-a2', 'A2', 'mini', 'ru.assess.a2.r1', 'practical-reading', 'Yeni randevu mesajında eylem', 'ru.intro', 'reading',
    'Ziyaretçi önce nereye uğramalı?', ['В аптеку', 'К врачу', 'В регистратуру'], 2,
    { passage: 'Приём у врача в 15.30. Сначала зайдите в регистратуру и покажите паспорт. Кабинет врача на втором этаже.' }),
  recall('ru-a2', 'A2', 'followup', 'ru.assess.a2.v1', 'service-words', 'Randevu kalıbını hatırlama', 'ru.intro', 'vocabulary',
    '“Doktordan randevu almak” kalıbını tamamla. ___ к врачу.', ['записаться']),
  ...production('ru-a2', 'A2', 'ru.assess.a2', 'ru.intro', 'Bir arkadaşına Rusça yaz. Görüşme saati değişti; bir sebep, yeni saat ve yer ver.'),
]

export const assessmentBank: readonly AssessmentItem[] = [...englishBeginner, ...englishIntermediate, ...englishAdvanced, ...russian]

export function routeLanguage(route: Route): Language {
  return route.startsWith('ru-') ? 'ru' : 'en'
}

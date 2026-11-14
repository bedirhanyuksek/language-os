import type { Module, Word } from '../continuity'

type Drill = [prompt: string, answer: string, ...alternatives: string[]]

export function practice(label: string, incorrect: string, correct: string, explanation: string,
  drills: [Drill, Drill, Drill, Drill, Drill, Drill]): Module['concepts'][number] {
  const [first, second, third, fourth, fifth, sixth] = drills
  return { label, incorrect, correct, explanation, guided: [first, second], transfer: [third, fourth], delayed: [fifth, sixth] }
}

export function expression(term: string, meaning: string, example: string, usage: string, pronunciation: string,
  collocations: string[], distractors: [string, string], use: string): Word {
  return {
    term, meaning, example, usage, pronunciation, collocations, use,
    recognize: [`“${term}” bu bağlamda ne anlama gelir?`, meaning, ...distractors, usage],
    recall: [`“${meaning}” anlamındaki hedef ifadeyi yaz.`, term],
  }
}

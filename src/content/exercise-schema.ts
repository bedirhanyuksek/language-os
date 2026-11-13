import { z } from 'zod'
import { idSchema, skillSchema } from '../domain/model'

export const line = z.string().trim().min(1).max(1000)
const common = { id: idSchema, prompt: line, skill: skillSchema, explanation: line }
const options = z.array(line).min(2).max(10)
export const exerciseSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...common, kind: z.literal('single'), options, accepted: options.element }),
  z.strictObject({ ...common, kind: z.literal('multiple'), options, accepted: z.array(line).min(1) }),
  z.strictObject({ ...common, kind: z.enum(['fill', 'short']), accepted: z.array(line).min(1) }),
  z.strictObject({ ...common, kind: z.enum(['sentence_order', 'word_order']), options, accepted: options }),
  z.strictObject({ ...common, kind: z.literal('matching'), options, prompts: options, accepted: options }),
  z.strictObject({ ...common, kind: z.literal('open'), sample: line }),
]).superRefine((exercise, ctx) => {
  const sameItems = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
  if ('options' in exercise && new Set(exercise.options.map((value) => value.normalize('NFC').toLowerCase().replace(/’/g, "'").replace(/\s+/g, ' ').replace(/[.?!]+$/, '').trim())).size !== exercise.options.length) {
    ctx.addIssue({ code: 'custom', message: 'Seçenekler benzersiz olmalı.' })
  }
  if (exercise.kind === 'single' && !exercise.options.includes(exercise.accepted)) {
    ctx.addIssue({ code: 'custom', message: 'Yanıt seçeneklerde bulunmalı.' })
  }
  if (exercise.kind === 'multiple' && (new Set(exercise.accepted).size !== exercise.accepted.length ||
    exercise.accepted.some((answer) => !exercise.options.includes(answer)))) {
    ctx.addIssue({ code: 'custom', message: 'Yanıtlar benzersiz ve seçenekler içinde olmalı.' })
  }
  if ((exercise.kind === 'sentence_order' || exercise.kind === 'word_order') &&
    !sameItems(exercise.options, exercise.accepted)) {
    ctx.addIssue({ code: 'custom', message: 'Sıralama bütün parçaları kullanmalı.' })
  }
  if (exercise.kind === 'matching' && (exercise.prompts.length !== exercise.accepted.length ||
    !sameItems(exercise.options, exercise.accepted))) {
    ctx.addIssue({ code: 'custom', message: 'Eşleştirme bire bir olmalı.' })
  }
})

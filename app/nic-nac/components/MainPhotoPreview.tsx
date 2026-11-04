import { Bubble } from './Bubble'

export function MainPhotoPreview({ url, question }: { url: string; question: string }) {
  return <Bubble variant="nicNac" images={[{ url }]} text={question} />
}

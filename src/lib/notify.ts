import { db } from './db'

export async function notify(params: {
  userId: string
  type: string // NEW_BID | BID_ACCEPTED | BID_REJECTED | NEW_MESSAGE | NEW_REVIEW | JOB_ASSIGNED
  title: string
  body: string
  link?: string
}) {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link || null,
      },
    })
  } catch (e) {
    // notifications are best-effort; never block the main action
    console.error('notify failed', e)
  }
}

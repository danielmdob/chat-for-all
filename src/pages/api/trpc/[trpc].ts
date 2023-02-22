import * as trpcNext from '@trpc/server/adapters/next'
import { z } from 'zod'
import { publicProcedure, router } from '~/server/trpc'
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  content: String,
  entityCreationTimestamp: Date,
  imageUrl: String,
})

const zMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  entityCreationTimestamp: z.date(),
})

// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema)

const appRouter = router({
  'msg.add': publicProcedure
    .input(
      z.object({
        content: z.string(),
        imageSizeBytes: z.number().optional(),
      }),
    )
    .output(
      z.object({
        presignedUrl: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      await mongoose.connect(process.env.MONGO_URL as string)
      const msg = new MessageModel({
        content: input.content,
        entityCreationTimestamp: new Date(),
      })
      await msg.save()
      const presignedUrl = Number(input.imageSizeBytes) > 0 ? msg.id : null
      return { presignedUrl }
    }),
  'msg.delete': publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await MessageModel.deleteOne({ _id: input.id })
    }),
  'msg.list': publicProcedure.output(z.array(zMessageSchema)).query(async () => {
    await mongoose.connect(process.env.MONGO_URL as string)
    return (await MessageModel.find({})).map((message) => {
      return {
        id: message.id,
        content: message.content,
        entityCreationTimestamp: message.entityCreationTimestamp,
      }
    })
  }),
})

// export only the type definition of the API
// None of the actual implementation is exposed to the client
export type AppRouter = typeof appRouter

// export API handler
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
})

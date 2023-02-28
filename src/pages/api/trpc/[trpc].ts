import * as trpcNext from '@trpc/server/adapters/next'
import { z } from 'zod'
import { publicProcedure, router } from '~/server/trpc'
import mongoose from 'mongoose'
import { deleteObject, getSignedRequest } from '~/server/s3'

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

export type Message = z.infer<typeof zMessageSchema>

// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema)

const connectDb = async () => {
  await mongoose.connect(process.env.MONGO_URL as string, { maxPoolSize: 10 })
}

const appRouter = router({
  'msg.add': publicProcedure
    .input(
      z.object({
        content: z.string(),
        imageSizeBytes: z.number().optional().nullish(),
      }),
    )
    .output(
      z.object({
        presignedUrl: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      await connectDb()
      const msg = new MessageModel({
        content: input.content,
        entityCreationTimestamp: new Date(),
      })
      await msg.save()
      const presignedUrl =
        Number(input.imageSizeBytes) > 0
          ? getSignedRequest({
              contentType: 'image/jpeg',
              key: msg.id,
              fileSizeBytes: Number(input.imageSizeBytes),
            })
          : null
      return { presignedUrl: presignedUrl }
    }),
  'msg.delete': publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      await MessageModel.deleteOne({ _id: input.id })
      deleteObject(input.id)
    }),
  'msg.list': publicProcedure.output(z.array(zMessageSchema)).query(async () => {
    await connectDb()
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

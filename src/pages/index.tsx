import { trpc } from '../utils/trpc'
import type { ReactElement } from 'react'
import { useState } from 'react'
import { ObjectId } from 'mongoose'

export default function IndexPage(): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('')
  const listResult = trpc['msg.list'].useQuery()
  const onMutationSuccess = async (): Promise<void> => {
    await trpcContext['msg.list'].invalidate()
  }
  const addMessageMutation = trpc['msg.add'].useMutation({
    onSuccess: onMutationSuccess,
  })
  const deleteMessageMutation = trpc['msg.delete'].useMutation({
    onSuccess: onMutationSuccess,
  })
  const trpcContext = trpc.useContext()

  const onSendClick = (): void => {
    addMessageMutation.mutate({
      content: messageContent,
    })
    setMessageContent('')
  }

  const onRemoveClick = (id: string): void => {
    deleteMessageMutation.mutate({
      id,
    })
  }

  if (listResult.data == null) {
    return (
      <div style={styles}>
        <h1>Loading...</h1>
      </div>
    )
  }

  return (
    <>
      <section className="pb-52">
        {listResult.data.map((message) => (
          <div className="border border-emerald-300 m-4 rounded-md p-4 group relative" key={message.id}>
            {message.content}
            <button
              className="bg-gray-300 absolute right-0.5 top-0.5 text-white rounded-md text-sm p-1 hidden group-hover:inline-block"
              onClick={() => {
                onRemoveClick(message.id)
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </section>
      <section className="fixed bottom-0 flex space-x-2 w-full h-52 p-2 bg-emerald-300">
        <textarea
          className="border rounded-md grow p-1"
          onChange={(e) => {
            setMessageContent(e.target.value)
          }}
          value={messageContent}
        />
        <button className="border rounded-md px-4 bg-white font-semibold text-emerald-300" onClick={onSendClick}>
          Send
        </button>
      </section>
    </>
  )
}

const styles = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

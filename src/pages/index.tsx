import { trpc } from '../utils/trpc'
import type { ChangeEvent, ReactElement } from 'react'
import { useEffect, useState, useRef } from 'react'
import type { Message } from './api/trpc/[trpc]'
import { v4 as uuid } from 'uuid'

function ScrollToBottom() {
  const elementRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => elementRef.current?.scrollIntoView())
  return <div ref={elementRef} />
}

type OutboxMessage = Message & { isOutbox: true }
export default function IndexPage(): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('')
  const [file, setFile] = useState<File | null>()
  const listResult = trpc['msg.list'].useQuery(undefined, {
    onSuccess: () => {
      setOutboxMessages([])
    },
  })
  const [outboxMessages, setOutboxMessages] = useState<OutboxMessage[]>([])
  const [messageToDeleteIds, setMessageToDeleteIds] = useState<string[]>([])
  const addMessageMutation = trpc['msg.add'].useMutation()
  const deleteMessageMutation = trpc['msg.delete'].useMutation()
  const trpcContext = trpc.useContext()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const messagesSectionRef = useRef<HTMLInputElement | null>(null)
  const onMutationSuccess = async (result: { presignedUrl?: string | null | undefined }): Promise<void> => {
    if (result.presignedUrl) {
      await fetch(result.presignedUrl, {
        method: 'PUT',
        body: file,
      })
      setFile(null)
    }
    await trpcContext['msg.list'].invalidate()
  }

  const handleSubmit = (): void => {
    setMessageContent('')
    setOutboxMessages((previousMessages) => [
      ...previousMessages,
      { content: messageContent, entityCreationTimestamp: new Date(), id: uuid(), isOutbox: true },
    ])
    addMessageMutation.mutate(
      {
        content: messageContent,
        imageSizeBytes: file?.size,
      },
      {
        onSuccess: onMutationSuccess,
      },
    )
  }

  const onRemoveClick = (id: string): void => {
    setMessageToDeleteIds((previousMessages) => [...previousMessages, id])
    deleteMessageMutation.mutate(
      {
        id,
      },
      {
        onSuccess: async () => await trpcContext['msg.list'].invalidate(),
      },
    )
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log('files', e.target.files)
    if (!e.target.files) {
      return
    }

    setFile(e.target.files[0])
  }

  const handleUploadClick = () => {
    // 👇 We redirect the click event onto the hidden input element
    inputRef.current?.click()
  }

  if (listResult.data == null) {
    return (
      <div style={styles}>
        <h1>Loading...</h1>
      </div>
    )
  }

  const shownMessages = [...listResult.data, ...outboxMessages].filter(
    (message) => !messageToDeleteIds.includes(message.id),
  )

  return (
    <>
      <input
        accept="image/*"
        className="hidden"
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        onClick={(event) => {
          event.target.value = null
        }}
      />
      <section className="pb-52" ref={messagesSectionRef}>
        {shownMessages.map((message) => (
          <div className="border border-emerald-300 m-4 rounded-md p-4 group relative" key={message.id}>
            <div>{message.content}</div>
            <img
              className="max-h-52 rounded mt-2"
              src={`https://chat-for-all-media.s3.amazonaws.com/${message.id}`}
              alt=""
            />
            <div className="text-xs mt-2 text-gray-400">
              {new Date(message.entityCreationTimestamp).toLocaleString()}
            </div>
            <button
              className="bg-gray-400 absolute right-0.5 top-0.5 text-white rounded-md text-sm p-1 hidden group-hover:inline-block"
              disabled={(message as OutboxMessage).isOutbox}
              onClick={() => {
                onRemoveClick(message.id)
              }}
            >
              Remove
            </button>
          </div>
        ))}
        {Boolean(outboxMessages.length) && <ScrollToBottom />}
      </section>
      <section className="fixed bottom-0 flex space-x-2 w-full h-52 p-2 bg-emerald-300">
        <textarea
          className="border rounded-md grow p-1"
          onChange={(e) => {
            setMessageContent(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit()
            }
          }}
          value={messageContent}
        />
        <button className="border rounded-md px-4 bg-white font-semibold text-emerald-300" onClick={handleUploadClick}>
          {file ? file.name : 'Add Image'}
        </button>
        <button className="border rounded-md px-4 bg-white font-semibold text-emerald-300" onClick={handleSubmit}>
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

import { trpc } from '../utils/trpc'
import type { ChangeEvent, ReactElement } from 'react'
import { useState, useRef } from 'react'
import { ObjectId } from 'mongoose'

export default function IndexPage(): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('')
  const [file, setFile] = useState<File | null>()
  const listResult = trpc['msg.list'].useQuery()
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
  const addMessageMutation = trpc['msg.add'].useMutation({
    onSuccess: onMutationSuccess,
  })
  const deleteMessageMutation = trpc['msg.delete'].useMutation({
    onSuccess: async () => await trpcContext['msg.list'].invalidate(),
  })
  const trpcContext = trpc.useContext()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const onSendClick = (): void => {
    addMessageMutation.mutate({
      content: messageContent,
      imageSizeBytes: file?.size,
    })
    setMessageContent('')
  }

  const onRemoveClick = (id: string): void => {
    deleteMessageMutation.mutate({
      id,
    })
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return
    }

    setFile(e.target.files[0])
  }

  const onUploadClick = () => {
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

  return (
    <>
      <input accept="image/*" className="hidden" type="file" ref={inputRef} onChange={onFileChange} />
      <section className="pb-52">
        {listResult.data.map((message) => (
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
        <button className="border rounded-md px-4 bg-white font-semibold text-emerald-300" onClick={onUploadClick}>
          {file ? file.name : 'Add Image'}
        </button>
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

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import ImageCropEditorModal, { type ImageCropResult } from '../photo/ImageCropEditorModal'

type PictureUploadStepProps = {
  value: string | null
  onChange: (file: File | null, previewUrl: string | null) => void
}

export default function PictureUploadStep({ value, onChange }: PictureUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSourceUrl, setEditorSourceUrl] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)

  useEffect(() => {
    if (!value) {
      setCurrentFile(null)
    }
  }, [value])

  useEffect(() => {
    return () => {
      if (editorSourceUrl) {
        URL.revokeObjectURL(editorSourceUrl)
      }
    }
  }, [editorSourceUrl])

  const closeEditor = () => {
    setEditorOpen(false)
    if (editorSourceUrl) {
      URL.revokeObjectURL(editorSourceUrl)
    }
    setEditorSourceUrl(null)
  }

  const openEditorForFile = (file: File) => {
    if (editorSourceUrl) {
      URL.revokeObjectURL(editorSourceUrl)
    }
    setEditorSourceUrl(URL.createObjectURL(file))
    setEditorOpen(true)
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    openEditorForFile(file)
  }

  const handleApplyCrop = async (result: ImageCropResult) => {
    setCurrentFile(result.file)
    onChange(result.file, result.previewUrl)
    closeEditor()
  }

  return (
    <>
      <div className="retro-upload">
        <input ref={fileInputRef} id="register-picture" type="file" accept="image/*" onChange={onFileChange} hidden />
        {value ? (
          <img src={value} alt="Preview" className="retro-upload-preview" />
        ) : (
          <div className="retro-upload-placeholder">
            <strong>ADD PROFILE PICTURE</strong>
            <span>Choose image then adjust zoom and crop</span>
          </div>
        )}
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="neo-btn" onClick={() => fileInputRef.current?.click()}>
            {value ? 'Choose Another' : 'Choose Photo'}
          </button>
          <button
            type="button"
            className="neo-btn"
            disabled={!currentFile}
            onClick={() => {
              if (!currentFile) return
              openEditorForFile(currentFile)
            }}
          >
            Edit Crop
          </button>
        </div>
      </div>

      <ImageCropEditorModal
        open={editorOpen}
        sourceUrl={editorSourceUrl}
        title="Adjust Profile Photo"
        confirmLabel="Use This Photo"
        onCancel={closeEditor}
        onConfirm={handleApplyCrop}
      />
    </>
  )
}

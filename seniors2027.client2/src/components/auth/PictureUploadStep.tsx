import type { ChangeEvent } from 'react'

type PictureUploadStepProps = {
  value: string | null
  onChange: (file: File | null, previewUrl: string | null) => void
}

export default function PictureUploadStep({ value, onChange }: PictureUploadStepProps) {
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      onChange(null, null)
      return
    }

    onChange(file, URL.createObjectURL(file))
  }

  return (
    <label className="retro-upload" htmlFor="register-picture">
      <input id="register-picture" type="file" accept="image/*" onChange={onFileChange} />
      {value ? (
        <img src={value} alt="Preview" className="retro-upload-preview" />
      ) : (
        <div className="retro-upload-placeholder">
          <strong>ADD PROFILE PICTURE</strong>
          <span>Tap to choose an image</span>
        </div>
      )}
    </label>
  )
}

import { useCallback, useState } from 'react'
import { Upload, X, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function FileUpload({
  accept = '.xlsx,.xls,.csv',
  maxSizeMB = 10,
  onFileSelect,
  progress = 0,
  error,
  preview,
}) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)


  const handleFile = useCallback(
    (f) => {
      if (!f) return
      if (f.size > maxSizeMB * 1024 * 1024) return
      setFile(f)
      onFileSelect?.(f)
    },
    [maxSizeMB, onFileSelect]
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition',
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50',
          error && 'border-red-400'
        )}
      >
        <Upload className="mb-3 h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">Drag & drop or click to upload</p>
        <p className="mt-1 text-xs text-slate-500">{accept} &mdash; max {maxSizeMB}MB</p>
        <input
          type="file"
          accept={accept}
          className="mt-4 text-sm"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {progress > 0 && progress < 100 && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {file && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
          <FileSpreadsheet className="h-5 w-5 text-brand-600" />
          <span className="flex-1 truncate text-sm">{file.name}</span>
          <button type="button" onClick={() => { setFile(null); onFileSelect?.(null) }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {preview}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

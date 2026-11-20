import type { ReactNode } from 'react'

export default function CameraFormField({ name, label, error, children }: { name: string; label: string; error?: string; children: ReactNode }) {
  return <div className="w10-field"><label htmlFor={'w10-' + name}>{label}</label>{children}
    {error && <small id={'w10-' + name + '-error'} className="w10-error">{error}</small>}</div>
}

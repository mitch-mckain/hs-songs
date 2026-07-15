'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F6F2E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display), Archivo, sans-serif', fontWeight: 700, fontSize: 18, color: '#17181c', marginBottom: 8 }}>
          Something went wrong
        </div>
        <div style={{ fontFamily: 'var(--font-ui), sans-serif', fontSize: 13, color: '#8f8f89', marginBottom: 24 }}>
          There was a problem loading the page.
        </div>
        <button
          onClick={reset}
          style={{ fontFamily: 'var(--font-ui), sans-serif', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 2, border: '1px solid #17181c', background: '#17181c', color: '#fff', cursor: 'pointer' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}

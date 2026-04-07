export default function PlaylistPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff' }}>
      <div style={{ padding: '28px 40px 60px', maxWidth: '700px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', color: '#1D1E20' }}>Playlist</h1>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            Permite que tus invitados sugieran canciones para el evento
          </p>
        </div>

        <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: '16px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#1D1E20', marginBottom: '8px' }}>
            Próximamente
          </div>
          <p style={{ fontSize: '14px', color: '#888', maxWidth: '320px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            Pronto tus invitados podrán sugerir canciones para la playlist del evento directamente desde su celular.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f0fdfb', border: '1px solid #48C9B0', borderRadius: '20px', fontSize: '13px', color: '#1a9e88', fontWeight: '600' }}>
            🚀 En desarrollo
          </div>
        </div>

      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase, supabaseReady } from './supabase'
import { Leaf, MapPin, Plus, Search, LogIn, LogOut, ShieldCheck, Camera, LocateFixed, AlertCircle } from 'lucide-react'

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

function SelectLocation({ onSelect }) {
  useMapEvents({ click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

export default function App() {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', scientific_name: '', description: '', location_type: 'public' })
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    loadPlants()
    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadPlants() {
    if (!supabaseReady) return
    setLoading(true)
    const { data, error } = await supabase.from('plants').select('*').eq('status', 'approved').order('created_at', { ascending: false })
    if (error) setNotice('Não foi possível carregar as plantas: ' + error.message)
    else setPlants(data ?? [])
    setLoading(false)
  }

  async function signIn() {
    const email = window.prompt('Seu e-mail:')
    if (!email) return
    const password = window.prompt('Sua senha:')
    if (!password) return
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setNotice(error ? error.message : 'Login realizado.')
  }

  async function signUp() {
    const email = window.prompt('E-mail para cadastro:')
    if (!email) return
    const password = window.prompt('Crie uma senha (mínimo 6 caracteres):')
    if (!password) return
    const { error } = await supabase.auth.signUp({ email, password })
    setNotice(error ? error.message : 'Cadastro iniciado. Confira seu e-mail se a confirmação estiver habilitada.')
  }

  async function submitPlant(e) {
    e.preventDefault()
    if (!user) { setNotice('Entre na sua conta para enviar uma planta.'); return }
    if (!selected) { setNotice('Toque no mapa para marcar a localização da planta.'); return }
    const payload = {
      common_name: form.name.trim(),
      scientific_name: form.scientific_name.trim() || null,
      description: form.description.trim() || null,
      latitude: selected.lat,
      longitude: selected.lng,
      location_type: form.location_type,
      status: 'pending',
      created_by: user.id,
    }
    const { data, error } = await supabase.from('plants').insert(payload).select('id').single()
    if (error) { setNotice('Erro ao enviar: ' + error.message); return }
    if (photo && data?.id) {
      const ext = photo.name.split('.').pop() || 'jpg'
      const path = user.id + '/' + data.id + '/' + Date.now() + '.' + ext
      const upload = await supabase.storage.from('plant-photos').upload(path, photo)
      if (!upload.error) {
        await supabase.from('plant_photos').insert({ plant_id: data.id, storage_path: path, caption: 'Foto enviada no cadastro', uploaded_by: user.id })
      } else {
        setNotice('Planta enviada, mas houve falha no envio da foto: ' + upload.error.message)
        setShowForm(false)
        return
      }
    }
    setNotice('Cadastro enviado para análise de um moderador. Ele ainda não está público.')
    setShowForm(false)
    setForm({ name: '', scientific_name: '', description: '', location_type: 'public' })
    setPhoto(null)
    setSelected(null)
  }

  async function confirmPlant(plant) {
    if (!user) { setNotice('Entre na sua conta para confirmar a presença.'); return }
    const { error } = await supabase.from('plant_confirmations').insert({
      plant_id: plant.id, confirmed_by: user.id, notes: 'Confirmação registrada pelo mapa'
    })
    setNotice(error ? 'Não foi possível confirmar: ' + error.message : 'Confirmação registrada. Obrigado!')
    if (!error) loadPlants()
  }

  const visiblePlants = plants.filter(p => [p.common_name, p.scientific_name, p.description].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Leaf size={22}/></span><span><strong>Ervas Vivas</strong><small>MAPA COLABORATIVO</small></span></a>
        <div className="account-actions">
          {user ? <button className="ghost" onClick={() => supabase.auth.signOut()}><LogOut size={17}/> Sair</button> : <><button className="ghost" onClick={signUp}>Criar conta</button><button className="login" onClick={signIn}><LogIn size={16}/> Entrar</button></>}
        </div>
      </header>

      <main>
        <section className="intro">
          <div><span className="eyebrow">CONHECIMENTO QUE FLORESCE EM COMUNIDADE</span><h1>Encontre. Conheça.<br/><em>Preserve.</em></h1><p>Um mapa colaborativo para descobrir plantas, ervas e árvores ao nosso redor.</p></div>
          <button className="primary add-button" onClick={() => setShowForm(true)}><Plus size={18}/> Cadastrar planta</button>
        </section>

        {!supabaseReady && <div className="notice warning"><AlertCircle size={18}/> O aplicativo está no ar em modo de configuração. Falta inserir as variáveis públicas do Supabase para carregar os dados.</div>}
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}

        <section className="map-section">
          <div className="map-heading"><div><span className="eyebrow">EXPLORAR</span><h2>Plantas perto de você</h2></div><label className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar uma planta..."/></label></div>
          <div className="map-wrap">
            <MapContainer center={[-23.3103, -51.1628]} zoom={12} scrollWheelZoom={true} className="map">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
              <SelectLocation onSelect={setSelected}/>
              {visiblePlants.map(p => <Marker key={p.id} position={[p.latitude, p.longitude]} icon={markerIcon}><Popup><strong>{p.common_name}</strong><p>{p.description || 'Sem descrição.'}</p><small>{p.scientific_name || ''}</small><p><button className="popup-action" onClick={() => confirmPlant(p)}>Confirmar presença</button></p><a target="_blank" rel="noreferrer" href={'https://www.google.com/maps?q=' + p.latitude + ',' + p.longitude}>Abrir no Google Maps</a></Popup></Marker>)}
              {selected && <Marker position={[selected.lat, selected.lng]} icon={markerIcon}><Popup>Local escolhido para novo cadastro</Popup></Marker>}
            </MapContainer>
            <div className="map-hint"><MapPin size={15}/> Toque no mapa para escolher um ponto de cadastro</div>
          </div>
          <div className="map-footer"><span><span className="dot"/> {loading ? 'Carregando...' : visiblePlants.length + ' plantas aprovadas'}</span><span><ShieldCheck size={15}/> Publicações passam por moderação</span></div>
        </section>

        <section className="info-strip"><div><LocateFixed/><strong>Localização colaborativa</strong><p>Marque o ponto no mapa ou use sua localização.</p></div><div><Camera/><strong>Fotos e registros</strong><p>Ajude a comunidade a reconhecer cada espécie.</p></div><div><ShieldCheck/><strong>Conteúdo revisado</strong><p>Novos cadastros aguardam aprovação.</p></div></section>
      </main>
      <footer>MAPA DAS ERVAS VIVAS <span>Feito para compartilhar conhecimento e preservar a natureza.</span></footer>

      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal" onSubmit={submitPlant} onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowForm(false)}>×</button><span className="eyebrow">NOVO REGISTRO</span><h2>Cadastrar uma planta</h2><p className="form-help">Preencha os dados e toque no mapa para marcar o local. O cadastro ficará pendente até a revisão.</p><label>Nome popular<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Ex.: Alecrim"/></label><label>Nome científico (opcional)<input value={form.scientific_name} onChange={e => setForm({...form, scientific_name:e.target.value})} placeholder="Ex.: Salvia rosmarinus"/></label><label>Descrição<textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Conte como identificar a planta..."/></label><label>Tipo de local<select value={form.location_type} onChange={e => setForm({...form, location_type:e.target.value})}><option value="public">Local público</option><option value="private">Propriedade particular (com autorização)</option><option value="approximate">Localização aproximada</option><option value="preservation">Área de preservação</option></select></label><label className="file-label"><Camera size={17}/> Foto (opcional)<input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)}/></label><div className="selected-location">{selected ? 'Ponto marcado: ' + selected.lat.toFixed(5) + ', ' + selected.lng.toFixed(5) : 'Nenhum ponto marcado. Feche o formulário e toque no mapa.'}</div><button className="primary submit" type="submit">Enviar para aprovação</button></form></div>}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { supabase, supabaseReady } from './supabase'
import { Leaf, MapPin, Plus, Search, LogIn, LogOut, ShieldCheck, Camera, LocateFixed, AlertCircle, Chrome, Bell, Check } from 'lucide-react'

function createPlantMarkerIcon(category) {
  const safeCategory = ['arvore', 'erva', 'flor', 'frutifera', 'arbusto'].includes(category) ? category : 'outra'
  return L.divIcon({
    className: 'plant-map-marker plant-map-marker-' + safeCategory,
    html: '<span class="plant-map-marker-pin"><span></span></span>',
    iconSize: [30, 38],
    iconAnchor: [15, 34],
    popupAnchor: [0, -34],
  })
}
const visitorIcon = L.divIcon({
  className: 'visitor-map-marker',
  html: '<span class="visitor-map-marker-pulse"><span></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

function SelectLocation({ onSelect }) {
  useMapEvents({ click(e) { onSelect({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

function RecenterMap({ position }) {
  const map = useMapEvents({})
  useEffect(() => { if (position) map.setView([position.lat, position.lng], 16) }, [position, map])
  return null
}

export default function App() {
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [pendingPlants, setPendingPlants] = useState([])
  const [pendingPhotos, setPendingPhotos] = useState({})
  const [photoUrls, setPhotoUrls] = useState({})
  const [auditHistory, setAuditHistory] = useState({})
  const [auditNames, setAuditNames] = useState({})
  const [recentAudit, setRecentAudit] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [reports, setReports] = useState([])
  const [reportNotes, setReportNotes] = useState({})
  const [reviewingReportId, setReviewingReportId] = useState(null)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('informacao incorreta')
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [mapHealth, setMapHealth] = useState({ invalid: 0, oldPending: 0, possibleDuplicates: 0 })
  const [healthIssues, setHealthIssues] = useState([])
  const [auditFilter, setAuditFilter] = useState('all')
  const [auditSearch, setAuditSearch] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [moderationNotes, setModerationNotes] = useState({})
  const [moderatingId, setModeratingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [locationGate, setLocationGate] = useState(false)
  const [locating, setLocating] = useState(false)
  const [selectingLocation, setSelectingLocation] = useState(false)
  const [authMode, setAuthMode] = useState(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [visitorLocation, setVisitorLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', scientific_name: '', description: '', category: 'erva', location_type: 'publico' })
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    loadPlants()
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true
    async function loadRole() {
      if (!user || !supabaseReady) { setUserRole(null); setShowAdmin(false); return }
      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (active) setUserRole(error ? null : data?.role ?? null)
    }
    loadRole()
    return () => { active = false }
  }, [user])

  useEffect(() => {
    if (!('geolocation' in navigator)) { setLocationStatus('unavailable'); return }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      position => {
        setVisitorLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationStatus('granted')
      },
      error => setLocationStatus(error.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  async function requestVisitorLocation() {
    if (!navigator.geolocation) { setLocationStatus('unavailable'); return }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      position => {
        setVisitorLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationStatus('granted')
        setNotice('Mapa centralizado na sua localização.')
      },
      error => setLocationStatus(error.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }

  async function loadNotifications() {
    if (!user || !supabaseReady) return
    const { data, error } = await supabase.from('user_notifications').select('*').order('created_at', { ascending: false }).limit(30)
    if (!error) setNotifications(data ?? [])
  }

  async function markNotificationRead(notification) {
    if (!notification.read_at) {
      const readAt = new Date().toISOString()
      const { error } = await supabase.from('user_notifications').update({ read_at: readAt }).eq('id', notification.id)
      if (!error) setNotifications(items => items.map(item => item.id === notification.id ? { ...item, read_at: readAt } : item))
    }
  }

  useEffect(() => {
    if (!user || !supabaseReady) { setNotifications([]); return }
    loadNotifications()
    const channel = supabase.channel('user-notifications-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: 'user_id=eq.' + user.id }, payload => {
        setNotifications(items => [payload.new, ...items].slice(0, 30))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function createPhotoUrls(photos) {
    const entries = await Promise.all((photos || []).map(async photo => {
      const { data, error } = await supabase.storage.from('plant-photos').createSignedUrl(photo.storage_path, 3600)
      return [photo.id, error ? null : data?.signedUrl || null]
    }))
    setPhotoUrls(current => ({ ...current, ...Object.fromEntries(entries.filter(([, url]) => url)) }))
  }

  async function approvePlantPhoto(photo, status) {
    const { error } = await supabase.from('plant_photos').update({ status }).eq('id', photo.id)
    if (error) { setNotice('Não foi possível atualizar a foto: ' + error.message); return }
    setPendingPhotos(groups => ({ ...groups, [photo.plant_id]: (groups[photo.plant_id] || []).map(item => item.id === photo.id ? { ...item, status } : item) }))
    setNotice(status === 'approved' ? 'Foto aprovada.' : 'Foto rejeitada e mantida fora do mapa.')
  }

  async function loadPendingPlants() {
    if (!user || !['admin', 'moderator'].includes(userRole)) return
    setAdminLoading(true)
    const { data: reportRows, error: reportError } = await supabase.from('plant_reports').select('*').order('created_at', { ascending: false }).limit(100)
    if (reportError) setNotice('Não foi possível carregar as denúncias: ' + reportError.message)
    else {
      const rows = reportRows ?? []
      const plantIds = [...new Set(rows.map(report => report.plant_id))]
      const reporterIds = [...new Set(rows.map(report => report.reporter_id))]
      const [{ data: reportPlants }, { data: reportProfiles }] = await Promise.all([
        plantIds.length ? supabase.from('plants').select('id,common_name').in('id', plantIds) : Promise.resolve({ data: [] }),
        reporterIds.length ? supabase.from('profiles').select('id,display_name').in('id', reporterIds) : Promise.resolve({ data: [] })
      ])
      const names = Object.fromEntries((reportPlants ?? []).map(plant => [plant.id, plant.common_name]))
      const people = Object.fromEntries((reportProfiles ?? []).map(profile => [profile.id, profile.display_name || 'Colaborador']))
      setReports(rows.map(report => ({ ...report, plantName: names[report.plant_id] || 'Planta removida', reporterName: people[report.reporter_id] || 'Colaborador' })))
    }
    const { data: latestLogs } = await supabase.from('plant_audit_log').select('*').order('created_at', { ascending: false }).limit(40)
    const historyRows = latestLogs ?? []
    const historyPlantIds = [...new Set(historyRows.map(log => log.plant_id))]
    const historyActorIds = [...new Set(historyRows.map(log => log.actor_id).filter(Boolean))]
    const [{ data: historyPlants }, { data: historyProfiles }] = await Promise.all([
      historyPlantIds.length ? supabase.from('plants').select('id,common_name').in('id', historyPlantIds) : Promise.resolve({ data: [] }),
      historyActorIds.length ? supabase.from('profiles').select('id,display_name').in('id', historyActorIds) : Promise.resolve({ data: [] })
    ])
    const plantNames = Object.fromEntries((historyPlants ?? []).map(plant => [plant.id, plant.common_name]))
    const actorNames = Object.fromEntries((historyProfiles ?? []).map(profile => [profile.id, profile.display_name || 'Colaborador']))
    setRecentAudit(historyRows.map(log => ({ ...log, plantName: plantNames[log.plant_id] || 'Planta removida', actorName: actorNames[log.actor_id] || 'Sistema' })))
    if (userRole === 'admin') {
      const [{ data: people }, { data: allPlants }] = await Promise.all([
        supabase.from('profiles').select('id,display_name,role').order('created_at', { ascending: false }).limit(200),
        supabase.from('plants').select('id,common_name,status,latitude,longitude,created_at').limit(2000)
      ])
      setCollaborators(people ?? [])
      const rows = allPlants ?? []
      const invalid = rows.filter(p => p.latitude == null || p.longitude == null || Math.abs(Number(p.latitude)) > 90 || Math.abs(Number(p.longitude)) > 180).length
      const oldPending = rows.filter(p => p.status === 'pending' && Date.now() - new Date(p.created_at).getTime() > 30 * 86400000).length
      const seen = new Map()
      const issues = []
      let possibleDuplicates = 0
      for (const plant of rows) {
        if (plant.latitude == null || plant.longitude == null || Math.abs(Number(plant.latitude)) > 90 || Math.abs(Number(plant.longitude)) > 180) {
          issues.push({ id: 'invalid-' + plant.id, type: 'invalid', plant, message: 'Coordenada ausente ou fora da faixa válida' })
          continue
        }
        if (plant.status === 'pending' && Date.now() - new Date(plant.created_at).getTime() > 30 * 86400000) issues.push({ id: 'old-' + plant.id, type: 'old', plant, message: 'Pendente há mais de 30 dias' })
        const key = (plant.common_name || '').trim().toLocaleLowerCase('pt-BR') + ':' + Number(plant.latitude).toFixed(3) + ':' + Number(plant.longitude).toFixed(3)
        if (seen.has(key)) {
          possibleDuplicates++
          issues.push({ id: 'duplicate-' + plant.id, type: 'duplicate', plant, other: seen.get(key), message: 'Possível duplicidade de nome e localização' })
        } else seen.set(key, plant)
      }
      setHealthIssues(issues)
      setMapHealth({ invalid, oldPending, possibleDuplicates })
    }
    const { data, error } = await supabase.from('plants').select('*').eq('status', 'pending').order('created_at', { ascending: true })
    if (error) {
      setNotice('Não foi possível carregar a fila de moderação: ' + error.message)
    } else {
      const plants = data ?? []
      setPendingPlants(plants)
      const ids = plants.map(plant => plant.id)
      if (ids.length) {
        const [{ data: photos }, { data: logs }] = await Promise.all([
          supabase.from('plant_photos').select('*').in('plant_id', ids).order('created_at', { ascending: true }),
          supabase.from('plant_audit_log').select('*').in('plant_id', ids).order('created_at', { ascending: false })
        ])
        const photoGroups = {}
        ;(photos ?? []).forEach(photo => { (photoGroups[photo.plant_id] ||= []).push(photo) })
        const logGroups = {}
        ;(logs ?? []).forEach(log => { (logGroups[log.plant_id] ||= []).push(log) })
        setPendingPhotos(photoGroups)
        await createPhotoUrls(photos ?? [])
        setAuditHistory(logGroups)
        const actorIds = [...new Set((logs ?? []).map(log => log.actor_id).filter(Boolean))]
        if (actorIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('id,display_name').in('id', actorIds)
          setAuditNames(Object.fromEntries((profiles ?? []).map(profile => [profile.id, profile.display_name || 'Colaborador'])))
        }
      } else {
        setPendingPhotos({})
        setAuditHistory({})
      }
    }
    setAdminLoading(false)
  }

  async function submitPlantReport(e) {
    e.preventDefault()
    if (!user) { setNotice('Entre na sua conta para denunciar uma publicação.'); setReportTarget(null); setAuthMode('signin'); return }
    if (!reportTarget) return
    setSubmittingReport(true)
    const { error } = await supabase.from('plant_reports').insert({
      plant_id: reportTarget.id,
      target_type: 'plant',
      target_id: reportTarget.id,
      reporter_id: user.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
      status: 'pending'
    })
    setSubmittingReport(false)
    if (error) { setNotice('Não foi possível enviar a denúncia: ' + error.message); return }
    setReportTarget(null)
    setReportReason('informacao incorreta')
    setReportDetails('')
    setNotice('Denúncia enviada. A equipe de moderação irá analisá-la.')
  }

  async function reviewReport(report, status) {
    const note = (reportNotes[report.id] || '').trim()
    setReviewingReportId(report.id)
    const reviewedAt = new Date().toISOString()
    const { error } = await supabase.from('plant_reports').update({ status, reviewed_by: user.id, reviewed_at: reviewedAt, resolution_note: note || null, updated_at: reviewedAt }).eq('id', report.id)
    setReviewingReportId(null)
    if (error) { setNotice('Não foi possível atualizar a denúncia: ' + error.message); return }
    setReports(items => items.map(item => item.id === report.id ? { ...item, status, reviewed_by: user.id, reviewed_at: reviewedAt, resolution_note: note || null } : item))
    setNotice(status === 'resolved' ? 'Denúncia marcada como resolvida.' : 'Denúncia arquivada.')
  }
  async function changeCollaboratorRole(person, role) {
    if (userRole !== 'admin' || person.id === user.id) return
    const { error } = await supabase.from('profiles').update({ role }).eq('id', person.id)
    if (error) { setNotice('Não foi possível alterar o papel: ' + error.message); return }
    setCollaborators(items => items.map(item => item.id === person.id ? { ...item, role } : item))
    setNotice('Papel do colaborador atualizado.')
  }

  async function removePlantPhoto(photo) {
    if (!window.confirm('Remover esta foto da publicação?')) return
    const storage = await supabase.storage.from('plant-photos').remove([photo.storage_path])
    if (storage.error) { setNotice('Não foi possível remover o arquivo: ' + storage.error.message); return }
    const { error } = await supabase.from('plant_photos').delete().eq('id', photo.id)
    if (error) { setNotice('Arquivo removido, mas não foi possível excluir o registro: ' + error.message); return }
    setPendingPhotos(groups => ({ ...groups, [photo.plant_id]: (groups[photo.plant_id] || []).filter(item => item.id !== photo.id) }))
    setNotice('Foto removida.')
  }

  async function moderatePlant(plant, status) {
    const note = (moderationNotes[plant.id] || '').trim()
    if (status === 'rejected' && !note) { setNotice('Escreva uma observação explicando o motivo da rejeição.'); return }
    setModeratingId(plant.id)
    const payload = { status, moderation_note: note || null, updated_by: user.id, approved_by: status === 'approved' ? user.id : null, approved_at: status === 'approved' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('plants').update(payload).eq('id', plant.id)
    setModeratingId(null)
    if (error) { setNotice('Não foi possível atualizar a publicação: ' + error.message); return }
    setNotice(status === 'approved' ? 'Planta aprovada e publicada no mapa.' : 'Publicação rejeitada. A observação foi registrada.')
    setPendingPlants(items => items.filter(item => item.id !== plant.id))
    if (status === 'approved') loadPlants()
  }
  async function loadPlants() {
    if (!supabaseReady) return
    setLoading(true)
    const { data, error } = await supabase.from('plants').select('*').eq('status', 'approved').order('created_at', { ascending: false })
    if (error) setNotice('Não foi possível carregar as plantas: ' + error.message)
    else setPlants(data ?? [])
    setLoading(false)
  }

  async function signInWithGoogle() {
    if (!supabaseReady) { setNotice('O serviço de autenticação ainda não está configurado.'); return }
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (error) { setNotice('Não foi possível iniciar o login com Google: ' + error.message); setAuthLoading(false) }
  }

  async function submitAuth(e) {
    e.preventDefault()
    if (!supabaseReady) { setNotice('O serviço de autenticação ainda não está configurado.'); return }
    if (authPassword.length < 6) { setNotice('A senha precisa ter pelo menos 6 caracteres.'); return }
    setAuthLoading(true)
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email: authEmail.trim(), password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword })
    setAuthLoading(false)
    if (result.error) { setNotice(result.error.message); return }
    setAuthEmail('')
    setAuthPassword('')
    setAuthMode(null)
    setNotice(authMode === 'signup' ? 'Cadastro iniciado. Confira seu e-mail para confirmar a conta, se solicitado.' : 'Login realizado com sucesso.')
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) { setNotice('Seu navegador não oferece localização. Marque o ponto manualmente no mapa.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude }
        setSelected(point)
        setLocating(false)
        setLocationGate(false)
        setSelectingLocation(false)
        setShowForm(true)
        setNotice('Localização atual capturada. Confira o ponto no mapa antes de enviar.')
      },
      error => {
        setLocating(false)
        const message = error.code === 1 ? 'Permissão de localização negada. Você pode marcar o ponto manualmente no mapa.' : error.code === 3 ? 'A localização demorou demais. Tente novamente ou marque no mapa.' : 'Não foi possível obter sua localização. Confira o GPS ou marque no mapa.'
        setNotice(message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  function startManualLocation() {
    setLocationGate(false)
    setSelectingLocation(true)
    setNotice('Toque no mapa no ponto exato onde a planta está. O cadastro abrirá em seguida.')
  }

  function handleMapSelection(point) {
    setSelected(point)
    if (selectingLocation) {
      setSelectingLocation(false)
      setShowForm(true)
      setNotice('Local marcado no mapa. Confira as coordenadas antes de enviar.')
    }
  }

  async function submitPlant(e) {
    e.preventDefault()
    if (!user) { setNotice('Entre na sua conta para enviar uma planta.'); return }
    if (!selected) { setNotice('Toque no mapa para marcar a localização da planta.'); return }
    const payload = {
      common_name: form.name.trim(),
      scientific_name: form.scientific_name.trim() || null,
      description: form.description.trim() || null,
      category: form.category,
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
        await supabase.from('plant_photos').insert({ plant_id: data.id, storage_path: path, caption: 'Foto enviada no cadastro', uploaded_by: user.id, status: 'pending' })
      } else {
        setNotice('Planta enviada, mas houve falha no envio da foto: ' + upload.error.message)
        setShowForm(false)
        return
      }
    }
    setNotice('Cadastro enviado para análise de um moderador. Ele ainda não está público.')
    setShowForm(false)
    setForm({ name: '', scientific_name: '', description: '', category: 'erva', location_type: 'publico' })
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

  function distanceKm(a, b) {
    const radians = value => value * Math.PI / 180
    const dLat = radians(b.lat - a.lat)
    const dLng = radians(b.lng - a.lng)
    const lat1 = radians(a.lat)
    const lat2 = radians(b.lat)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  }
  const visiblePlants = plants.filter(p => [p.common_name, p.scientific_name, p.description].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase()) && (selectedCategory === 'todas' || p.category === selectedCategory))
    .map(p => ({ ...p, distance: visitorLocation ? distanceKm(visitorLocation, { lat: Number(p.latitude), lng: Number(p.longitude) }) : null }))
    .sort((a, b) => visitorLocation ? a.distance - b.distance : 0)
  const filteredAudit = recentAudit.filter(log => (auditFilter === 'all' || log.action === auditFilter) && (log.plantName + ' ' + log.actorName + ' ' + (log.new_data?.moderation_note || '')).toLowerCase().includes(auditSearch.toLowerCase()))
  const categories = [{ value: 'todas', label: 'Todas', color: '#dce7dc' }, { value: 'arvore', label: 'Árvores', color: '#b9d8b8' }, { value: 'erva', label: 'Ervas', color: '#c5dfd5' }, { value: 'flor', label: 'Flores', color: '#f0cbd8' }, { value: 'frutifera', label: 'Frutíferas', color: '#f2d2b8' }, { value: 'arbusto', label: 'Arbustos', color: '#d8cbed' }, { value: 'outra', label: 'Outras', color: '#e5dfc9' }]

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><img src="/logo-mapa-ervas-vivas.svg" alt="" /></span><span><strong>Ervas Vivas</strong><small>MAPA COLABORATIVO</small></span></a>
        <div className="account-actions">
          {user ? <><button className="ghost notification-nav" onClick={() => { setShowNotifications(v => !v); if (!showNotifications) loadNotifications() }} aria-label="Notificações"><Bell size={17}/> Avisos{notifications.some(item => !item.read_at) && <span className="notification-count">{notifications.filter(item => !item.read_at).length}</span>}</button>{['admin', 'moderator'].includes(userRole) && <button className="ghost moderation-nav" onClick={() => { setShowAdmin(v => !v); if (!showAdmin) loadPendingPlants() }}><ShieldCheck size={17}/> {showAdmin ? 'Voltar ao mapa' : 'Moderação'}</button>}<button className="ghost" onClick={() => supabase.auth.signOut()}><LogOut size={17}/> Sair</button></> : <><button className="ghost" onClick={() => setAuthMode('signup')}>Criar conta</button><button className="login" onClick={() => setAuthMode('signin')}><LogIn size={16}/> Entrar</button></>}
        </div>
      </header>
      {showNotifications && user && <section className="notifications-panel">
        <div className="notifications-heading"><strong>Notificações</strong><button type="button" onClick={loadNotifications}>Atualizar</button></div>
        {notifications.length === 0 ? <p className="notifications-empty">Você ainda não tem avisos.</p> : notifications.map(item => <article className={'notification-item ' + (item.read_at ? 'is-read' : 'is-unread')} key={item.id}>
          <div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('pt-BR')}</small></div>
          {!item.read_at && <button type="button" aria-label="Marcar como lida" onClick={() => markNotificationRead(item)}><Check size={16}/></button>}
        </article>)}
      </section>}

      <main>
        <section className="intro">
          <div><span className="eyebrow">CONHECIMENTO QUE FLORESCE EM COMUNIDADE</span><h1>Encontre. Conheça.<br/><em>Preserve.</em></h1><p>Um mapa colaborativo para descobrir plantas, ervas e árvores ao nosso redor.</p></div>
          <button className="primary add-button" onClick={() => { setLocationGate(true); setNotice('') }}><Plus size={18}/> Cadastrar planta</button>
        </section>

        {!supabaseReady && <div className="notice warning"><AlertCircle size={18}/> O aplicativo está no ar em modo de configuração. Falta inserir as variáveis públicas do Supabase para carregar os dados.</div>}
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}

        {showAdmin && ['admin', 'moderator'].includes(userRole) && <section className="admin-panel">
          <div className="admin-heading"><div><span className="eyebrow">ÁREA RESTRITA</span><h2>Painel de moderação</h2><p>Revise os registros enviados pela comunidade antes de publicá-los.</p></div><button className="ghost" onClick={loadPendingPlants} disabled={adminLoading}>Atualizar fila</button></div>
          {['admin', 'moderator'].includes(userRole) && <section className="admin-subsection report-moderation">
<div className="report-heading"><div><h3>Denúncias da comunidade</h3><p>Área restrita a administradores e moderadores.</p></div><span className="report-pending-count">{reports.filter(report => report.status === "pending").length} pendentes</span></div>
{reports.length === 0 ? <p className="admin-empty">Nenhuma denúncia registrada.</p> : reports.map(report => <article className={"report-card report-" + report.status} key={report.id}>
<div className="report-card-top"><strong>{report.target_type === "plant" ? "Denúncia de planta" : report.target_type === "review" ? "Denúncia de avaliação" : "Denúncia de comentário"}</strong><span className={"report-status " + report.status}>{report.status === "pending" ? "Pendente" : report.status === "resolved" ? "Resolvida" : "Arquivada"}</span></div>
<p className="report-target"><b>{report.plantName}</b> · {report.reason}</p>
{report.details && <p className="report-details">{report.details}</p>}
<div className="report-meta">Enviada por {report.reporterName} · {new Date(report.created_at).toLocaleString("pt-BR")}</div>
{report.resolution_note && <p className="report-resolution">Decisão: {report.resolution_note}</p>}
{report.status === "pending" && <><label className="report-note-label">Nota interna (opcional)<textarea value={reportNotes[report.id] || ""} onChange={e => setReportNotes(notes => ({ ...notes, [report.id]: e.target.value }))} placeholder="Registre o motivo da decisão..."/></label><div className="report-actions"><button type="button" className="approve-button" disabled={reviewingReportId === report.id} onClick={() => reviewReport(report, "resolved")}>Resolver denúncia</button><button type="button" className="reject-button" disabled={reviewingReportId === report.id} onClick={() => reviewReport(report, "dismissed")}>Arquivar</button></div></>}
</article>)}
</section>}
{userRole === 'admin' && <><section className="admin-subsection"><h3>Colaboradores</h3><p>Gerencie os níveis de acesso. Seu próprio papel de administrador fica protegido.</p>{collaborators.length === 0 ? <p className="admin-empty">Nenhum perfil encontrado.</p> : collaborators.map(person => <div className="collaborator-row" key={person.id}><div><strong>{person.display_name || 'Colaborador'}</strong><small>{person.id === user.id ? 'Sua conta' : 'Conta cadastrada'}</small></div><select aria-label={'Papel de ' + (person.display_name || 'colaborador')} value={person.role} disabled={person.id === user.id} onChange={e => changeCollaboratorRole(person, e.target.value)}><option value="contributor">Colaborador</option><option value="moderator">Moderador</option><option value="admin">Administrador</option></select></div>)}</section>
          <section className="admin-subsection"><h3>Saúde do mapa</h3><div className="health-grid"><div><strong>{mapHealth.invalid}</strong><span>Coordenadas ausentes ou inválidas</span></div><div><strong>{mapHealth.possibleDuplicates}</strong><span>Possíveis duplicidades</span></div><div><strong>{mapHealth.oldPending}</strong><span>Pendentes há mais de 30 dias</span></div></div><p className="health-note">As duplicidades são sugestões automáticas por nome e proximidade; confira antes de alterar qualquer registro.</p>{healthIssues.length > 0 && <div className="health-issues"><strong>Ocorrências para revisar</strong>{healthIssues.slice(0, 30).map(issue => <div className="health-issue" key={issue.id}><div><b>{issue.plant.common_name || 'Planta sem nome'}</b><span>{issue.message}{issue.other ? ' · semelhante a ' + issue.other.common_name : ''}</span></div>{issue.plant.latitude != null && issue.plant.longitude != null && Math.abs(Number(issue.plant.latitude)) <= 90 && Math.abs(Number(issue.plant.longitude)) <= 180 && <a href={'https://www.google.com/maps?q=' + issue.plant.latitude + ',' + issue.plant.longitude} target="_blank" rel="noreferrer">Ver ponto</a>}</div>)}</div>}</section></>}
          <section className="admin-subsection"><h3>Histórico recente</h3><div className="audit-filters"><input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Buscar planta, colaborador ou observação"/><select value={auditFilter} onChange={e => setAuditFilter(e.target.value)}><option value="all">Todas as ações</option><option value="created">Cadastros</option><option value="updated">Atualizações</option></select></div>{filteredAudit.length === 0 ? <p className="admin-empty">Nenhuma movimentação corresponde ao filtro.</p> : filteredAudit.map(log => <div className="recent-audit-row" key={log.id}><div><strong>{log.plantName}</strong><span>{log.action === 'created' ? 'Cadastro enviado' : log.action === 'updated' ? 'Registro atualizado' : log.action} · {log.actorName}</span>{log.new_data?.moderation_note && <small>Observação: {log.new_data.moderation_note}</small>}<details className="audit-detail"><summary>Ver alterações</summary><pre>{JSON.stringify({ antes: log.old_data, depois: log.new_data }, null, 2)}</pre></details></div><time>{new Date(log.created_at).toLocaleString('pt-BR')}</time></div>)}</section>
          <div className="admin-count">{pendingPlants.length} publicação(ões) aguardando análise</div>
          {adminLoading ? <p className="admin-empty">Carregando publicações...</p> : pendingPlants.length === 0 ? <p className="admin-empty">Nenhuma publicação pendente no momento.</p> : pendingPlants.map(plant => <article className="pending-card" key={plant.id}>
            <div className="pending-title"><div><h3>{plant.common_name}</h3><span>{plant.scientific_name || 'Nome científico não informado'} · {plant.category}</span></div><span className="pending-status">Pendente</span></div>
            {plant.description && <p>{plant.description}</p>}
            {(pendingPhotos[plant.id] || []).length > 0 && <div className="moderation-photos"><strong>Fotos enviadas</strong><div className="moderation-photo-grid">{pendingPhotos[plant.id].map(photo => {
              const imageUrl = photoUrls[photo.id]
              return <figure key={photo.id}>{imageUrl ? <a href={imageUrl} target="_blank" rel="noreferrer"><img src={imageUrl} alt={photo.caption || 'Foto enviada pelo colaborador'}/></a> : <div className="photo-unavailable">Prévia indisponível</div>}<figcaption>{photo.caption || 'Sem legenda'}<span className={'photo-status ' + photo.status}>{photo.status === 'approved' ? 'Aprovada' : photo.status === 'rejected' ? 'Rejeitada' : 'Pendente'}</span>{photo.status === 'pending' && <div className="photo-review-actions"><button type="button" onClick={() => approvePlantPhoto(photo, 'approved')}>Aprovar foto</button><button type="button" onClick={() => approvePlantPhoto(photo, 'rejected')}>Rejeitar foto</button></div>}<button type="button" onClick={() => removePlantPhoto(photo)}>Remover foto</button></figcaption></figure>
            })}</div></div>}
            <p className="pending-coordinates"><MapPin size={14}/> {Number(plant.latitude).toFixed(5)}, {Number(plant.longitude).toFixed(5)} · {plant.location_type}</p>
            <a href={'https://www.google.com/maps?q=' + plant.latitude + ',' + plant.longitude} target="_blank" rel="noreferrer">Ver localização no mapa</a>
            <label>Observação da moderação<textarea value={moderationNotes[plant.id] || ''} onChange={e => setModerationNotes(notes => ({...notes, [plant.id]: e.target.value}))} placeholder="Explique o motivo caso precise rejeitar ou deixe uma orientação..."/></label>
            {(auditHistory[plant.id] || []).length > 0 && <details className="plant-history"><summary>Histórico ({auditHistory[plant.id].length})</summary>{auditHistory[plant.id].map(log => <div key={log.id}><strong>{log.action === 'created' ? 'Cadastro criado' : log.action === 'updated' ? 'Registro atualizado' : log.action}</strong><small>{auditNames[log.actor_id] || 'Sistema'} · {new Date(log.created_at).toLocaleString('pt-BR')}</small>{log.new_data?.moderation_note && <p>{log.new_data.moderation_note}</p>}</div>)}</details>}
            <div className="moderation-actions"><button className="approve-button" disabled={moderatingId === plant.id} onClick={() => moderatePlant(plant, 'approved')}>Aprovar publicação</button><button className="reject-button" disabled={moderatingId === plant.id} onClick={() => moderatePlant(plant, 'rejected')}>Rejeitar</button></div>
          </article>)}
        </section>}

        <section className="map-section">
          <div className="map-heading"><div><span className="eyebrow">EXPLORAR</span><h2>Explore a natureza ao seu redor</h2></div><label className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Busque por nome, espécie, erva, flor ou árvore..."/></label></div>
          {visitorLocation && <div className="location-nearby-note"><LocateFixed size={15}/> Mostrando plantas mais próximas de você. <button type="button" onClick={() => { setVisitorLocation(null); setLocationStatus('idle') }}>Desativar proximidade</button></div>}
          {!visitorLocation && locationStatus !== 'requesting' && <div className="location-nearby-note"><LocateFixed size={15}/>{locationStatus === 'denied' ? 'Localização não autorizada.' : locationStatus === 'unavailable' ? 'Não foi possível obter sua localização.' : 'Ative sua localização para encontrar plantas próximas.'}<button type="button" onClick={requestVisitorLocation}>Usar minha localização</button></div>}
          <div className="category-filters" aria-label="Filtrar por categoria">{categories.map(category => <button key={category.value} type="button" className={'category-filter category-filter-' + category.value + (selectedCategory === category.value ? ' active' : '')} onClick={() => setSelectedCategory(category.value)}><span className="category-color-dot" aria-hidden="true" />{category.label}</button>)}</div>
          <div className="map-wrap">
            <MapContainer center={visitorLocation ? [visitorLocation.lat, visitorLocation.lng] : [-23.3103, -51.1628]} zoom={visitorLocation ? 14 : 12} scrollWheelZoom={true} className="map">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
              <SelectLocation onSelect={handleMapSelection}/><RecenterMap position={selected || visitorLocation}/>
              {visiblePlants.map(p => <Marker key={p.id} position={[p.latitude, p.longitude]} icon={createPlantMarkerIcon(p.category)}><Popup><strong>{p.common_name}</strong><p>{p.description || 'Sem descrição.'}</p><small>{p.scientific_name || ''}</small><p><button className="popup-action" onClick={() => confirmPlant(p)}>Confirmar presença</button> <button className="popup-report-action" onClick={() => { if (!user) { setAuthMode('signin'); setNotice('Entre na sua conta para denunciar uma publicação.') } else { setReportTarget(p); setReportDetails('') } }}>Denunciar</button></p><a target="_blank" rel="noreferrer" href={'https://www.google.com/maps?q=' + p.latitude + ',' + p.longitude}>Abrir no Google Maps</a></Popup></Marker>)}
              {visitorLocation && <Marker position={[visitorLocation.lat, visitorLocation.lng]} icon={visitorIcon}><Popup>Você está aqui (localização visível apenas neste navegador)</Popup></Marker>}
              {selected && <Marker position={[selected.lat, selected.lng]} icon={markerIcon}><Popup>Local escolhido para novo cadastro</Popup></Marker>}
            </MapContainer>
            <div className="map-hint"><MapPin size={15}/> {selectingLocation ? 'Toque no ponto exato da planta para continuar' : 'Use o mapa para explorar e localizar plantas'}</div>
          </div>
          <div className="map-footer"><span><span className="dot"/> {loading ? 'Carregando...' : visiblePlants.length + ' plantas aprovadas'}</span><span><ShieldCheck size={15}/> Publicações passam por moderação</span></div>
        </section>

        <section className="info-strip"><div><LocateFixed/><strong>Localização colaborativa</strong><p>Marque o ponto no mapa ou use sua localização.</p></div><div><Camera/><strong>Fotos e registros</strong><p>Ajude a comunidade a reconhecer cada espécie.</p></div><div><ShieldCheck/><strong>Conteúdo revisado</strong><p>Novos cadastros aguardam aprovação.</p></div></section>
      </main>
      <footer>MAPA DAS ERVAS VIVAS <span>Feito para compartilhar conhecimento e preservar a natureza.</span><small className="app-version">Versão 0.2.0</small></footer>

      {reportTarget && <div className="modal-backdrop" onClick={() => { if (!submittingReport) setReportTarget(null) }}><form className="modal" onSubmit={submitPlantReport} onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setReportTarget(null)} disabled={submittingReport}>×</button><span className="eyebrow">CONTRIBUIÇÃO DA COMUNIDADE</span><h2>Denunciar publicação</h2><p className="form-help">Sua denúncia será enviada em privado para a equipe de moderação. Use este recurso para sinalizar problemas reais no registro.</p><strong className="report-form-plant">{reportTarget.common_name}</strong><label>Motivo<select value={reportReason} onChange={e => setReportReason(e.target.value)}><option value="informacao incorreta">Informação incorreta</option><option value="localizacao incorreta">Localização incorreta</option><option value="duplicidade">Publicação duplicada</option><option value="conteudo inadequado">Conteúdo inadequado</option><option value="risco ambiental">Risco ambiental ou acesso indevido</option><option value="outro">Outro motivo</option></select></label><label>Detalhes (opcional)<textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} maxLength={2000} placeholder="Explique o que precisa ser verificado..."/></label><button className="primary submit" type="submit" disabled={submittingReport}>{submittingReport ? 'Enviando...' : 'Enviar denúncia'}</button></form></div>}

      {authMode && <div className="modal-backdrop" onClick={() => { if (!authLoading) setAuthMode(null) }}><section className="modal auth-modal" onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setAuthMode(null)} disabled={authLoading}>×</button><span className="eyebrow">MAPA DAS ERVAS VIVAS</span><h2>{authMode === 'signup' ? 'Crie sua conta' : 'Bem-vindo de volta'}</h2><p className="form-help">{authMode === 'signup' ? 'Participe da comunidade e ajude a registrar a natureza ao nosso redor.' : 'Entre para colaborar com o mapa e acompanhar seus registros.'}</p><button type="button" className="google-auth-button" onClick={signInWithGoogle} disabled={authLoading}><Chrome size={18}/> Continuar com Google</button><div className="auth-divider"><span>ou continue com e-mail</span></div><form onSubmit={submitAuth}><label>E-mail<input type="email" autoComplete="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="primary submit" type="submit" disabled={authLoading}>{authLoading ? 'Aguarde...' : authMode === 'signup' ? 'Criar conta com e-mail' : 'Entrar com e-mail'}</button></form><p className="auth-switch">{authMode === 'signup' ? 'Já tem uma conta?' : 'Ainda não tem conta?'} <button type="button" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Entrar' : 'Criar conta'}</button></p></section></div>}

      {locationGate && <div className="modal-backdrop" onClick={() => setLocationGate(false)}><section className="modal location-gate" onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setLocationGate(false)}>×</button><span className="eyebrow">ANTES DE CADASTRAR</span><h2>Onde está a planta?</h2><p className="form-help">Para registrar uma planta, precisamos marcar no mapa o local onde ela está. Você pode compartilhar sua localização atual ou escolher o ponto manualmente.</p><button type="button" className="primary submit" onClick={requestCurrentLocation} disabled={locating}><LocateFixed size={18}/>{locating ? 'Obtendo localização...' : 'Usar minha localização atual'}</button><button type="button" className="manual-location-button" onClick={startManualLocation} disabled={locating}><MapPin size={18}/> Marcar manualmente no mapa</button><p className="location-privacy">O navegador pedirá sua autorização para acessar o GPS. Sua localização só será usada para posicionar este cadastro.</p></section></div>}

      {showForm && <div className="modal-backdrop" onClick={() => setShowForm(false)}><form className="modal" onSubmit={submitPlant} onClick={e => e.stopPropagation()}><button type="button" className="close" onClick={() => setShowForm(false)}>×</button><span className="eyebrow">NOVO REGISTRO</span><h2>Cadastrar uma planta</h2><p className="form-help">Preencha os dados e toque no mapa para marcar o local. O cadastro ficará pendente até a revisão.</p><label>Nome popular<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Ex.: Alecrim"/></label><label>Nome científico (opcional)<input value={form.scientific_name} onChange={e => setForm({...form, scientific_name:e.target.value})} placeholder="Ex.: Salvia rosmarinus"/></label><label>Categoria<select value={form.category} onChange={e => setForm({...form, category:e.target.value})}><option value="arvore">Árvore</option><option value="erva">Erva</option><option value="flor">Flor</option><option value="frutifera">Frutífera</option><option value="arbusto">Arbusto</option><option value="outra">Outra</option></select></label><label>Descrição<textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Conte como identificar a planta..."/></label><label>Tipo de local<select value={form.location_type} onChange={e => setForm({...form, location_type:e.target.value})}><option value="publico">Local público</option><option value="particular">Propriedade particular (com autorização)</option><option value="aproximado">Localização aproximada</option><option value="preservacao">Área de preservação</option></select></label><label className="file-label"><Camera size={17}/> Foto (opcional)<input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)}/></label><div className="selected-location">{selected ? 'Ponto marcado: ' + selected.lat.toFixed(5) + ', ' + selected.lng.toFixed(5) : 'Nenhum ponto marcado. Feche o formulário e escolha a localização no mapa.'}</div><button className="primary submit" type="submit">Enviar para aprovação</button></form></div>}
    </div>
  )
}
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TimelineTask } from '@/lib/types'
import {
  CalendarDays, Star, CheckCircle2, Circle,
  Plus, ChevronDown, ChevronLeft, ChevronRight,
  Calendar, LayoutList, Search, SlidersHorizontal, X, Bell
} from 'lucide-react'

const CATEGORIES = [
  { value: 'evento',       label: 'Evento',       color: 'bg-teal-100 text-teal-800' },
  { value: 'tarea',        label: 'Tarea',        color: 'bg-blue-100 text-blue-800' },
  { value: 'recordatorio', label: 'Recordatorio', color: 'bg-amber-100 text-amber-800' },
  { value: 'reunion',      label: 'Reunión',      color: 'bg-purple-100 text-purple-800' },
  { value: 'entrega',      label: 'Entrega',      color: 'bg-orange-100 text-orange-800' },
  { value: 'pago',         label: 'Pago',         color: 'bg-red-100 text-red-800' },
  { value: 'comunicacion', label: 'Comunicación', color: 'bg-pink-100 text-pink-800' },
  { value: 'otro',         label: 'Otro',         color: 'bg-gray-100 text-gray-600' },
]

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const EMOJIS      = ['📩','✅','💳','💐','🎉','🤝','📦','🔔','📅','🎊','🍽️','📸','🎶','✈️','🏨','💍','👗','💄','🌸','🎁']

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(d: string) {
  const [, month, day] = d.split('-').map(Number)
  return `${day} ${MONTH_NAMES[month - 1].slice(0, 3).toLowerCase()}`
}

function groupByMonth(tasks: TimelineTask[]) {
  const groups: Record<string, TimelineTask[]> = {}
  tasks.forEach(t => {
    const [year, month] = t.task_date.split('-')
    const key = `${year}-${month}`
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  return groups
}

function getCat(v: string) {
  return CATEGORIES.find(c => c.value === v) || CATEGORIES[7]
}

function openGoogleCalendar(task: TimelineTask) {
  const [year, month, day] = task.task_date.split('-').map(Number)
  const pad = (n: number) => n.toString().padStart(2, '0')
  let dates: string
  if (task.task_time) {
    const [h, m] = task.task_time.split(':').map(Number)
    const start = `${year}${pad(month)}${pad(day)}T${pad(h)}${pad(m)}00`
    const endH  = h + 1 >= 24 ? 23 : h + 1
    const end   = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(m)}00`
    dates = `${start}/${end}`
  } else {
    const startDay = `${year}${pad(month)}${pad(day)}`
    const nextDate = new Date(year, month - 1, day + 1)
    const endDay   = `${nextDate.getFullYear()}${pad(nextDate.getMonth() + 1)}${pad(nextDate.getDate())}`
    dates = `${startDay}/${endDay}`
  }
  const title   = encodeURIComponent(`${task.emoji ? task.emoji + ' ' : ''}${task.title}`)
  const details = task.notes ? encodeURIComponent(task.notes) : ''
  const url     = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}${details ? `&details=${details}` : ''}`
  window.open(url, '_blank')
}

function CategoryIcon({ category }: { category: string }) {
  const cls = "w-4 h-4 fill-none stroke-[1.5px] stroke-[#888]"
  const icons: Record<string, React.JSX.Element> = {
    evento: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    tarea: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    recordatorio: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    reunion: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    entrega: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    pago: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
    comunicacion: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    otro: <svg viewBox="0 0 24 24" className={cls} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-[#f8f8f8] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
      {icons[category] || icons.otro}
    </div>
  )
}

function CalendarTaskIcon({ category }: { category: string }) {
  const props = { width: 10, height: 10, viewBox: "0 0 24 24", fill: "none", stroke: "#888", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "flex-shrink-0" }
  const icons: Record<string, React.JSX.Element> = {
    evento:       <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
    tarea:        <svg {...props}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    recordatorio: <svg {...props}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    reunion:      <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    entrega:      <svg {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    pago:         <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
    comunicacion: <svg {...props}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    otro:         <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  }
  return icons[category] || icons.otro
}

function TaskCard({ t, onEdit, onToggleCompleted }: {
  t: TimelineTask
  onEdit: (t: TimelineTask) => void
  onToggleCompleted: (t: TimelineTask) => void
}) {
  const cat = getCat(t.category)
  return (
    <div
      onClick={() => onEdit(t)}
      className={[
        'flex-1 my-1.5 ml-3 bg-white border border-[#e8e8e8] cursor-pointer rounded-xl transition-all hover:border-[#48C9B0]',
        t.is_completed ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">
        {t.emoji && <span className="text-base flex-shrink-0 leading-none mt-0.5">{t.emoji}</span>}
        <span className={['flex-1 text-sm font-semibold leading-snug', t.is_completed ? 'line-through text-[#aaa]' : 'text-[#1D1E20]'].join(' ')}>
          {t.title}
        </span>
        {t.is_highlighted && <Star size={12} className="flex-shrink-0 text-amber-400 fill-amber-400 mt-0.5" />}
        <button onClick={e => { e.stopPropagation(); onToggleCompleted(t) }} className="flex-shrink-0 mt-0.5">
          {t.is_completed ? <CheckCircle2 size={16} className="text-[#48C9B0]" /> : <Circle size={16} className="text-[#ccc]" />}
        </button>
      </div>
      <div className="px-3 pb-1">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
      </div>
      <div className="flex items-center gap-2 px-3 pb-2.5 min-w-0 flex-wrap">
        <span className="flex-shrink-0 text-[11px] text-[#aaa]">
          {formatDate(t.task_date)}{t.task_time ? ` · ${formatTime(t.task_time)}` : ''}
        </span>
        {t.notes && (
          <><span className="text-[#e0e0e0] flex-shrink-0">·</span>
          <span className="hidden sm:block text-[11px] text-[#bbb] truncate min-w-0 max-w-[300px]" title={t.notes}>{t.notes}</span></>
        )}
        {t.reminder_date && (
          <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-[#48C9B0]">
            <Bell size={10} />{formatDate(t.reminder_date.split('T')[0])}
          </span>
        )}
      </div>
      <div className="flex items-center border-t border-[#f0f0f0] px-3 py-1.5">
        <button onClick={e => { e.stopPropagation(); openGoogleCalendar(t) }}
          className="flex items-center gap-1 text-[11px] text-[#bbb] hover:text-[#48C9B0] transition-colors">
          <Calendar size={11} />
          <span className="hidden sm:inline">Agregar a Google Calendar</span>
          <span className="sm:hidden">Google Calendar</span>
        </button>
      </div>
    </div>
  )
}

interface ModalProps {
  editTask: TimelineTask | null
  prefillDate: string | null
  onClose: () => void
  onSaved: () => void
  eventId: string
}

function TaskModal({ editTask, prefillDate, onClose, onSaved, eventId }: ModalProps) {
  const [form, setForm] = useState({
    title: '', emoji: '', category: 'tarea' as TimelineTask['category'],
    task_date: '', task_time: '', notes: '', is_highlighted: false,
    reminder_enabled: false, reminder_date: '', reminder_time: '',
  })
  const [saving, setSaving]       = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  useEffect(() => {
    if (editTask) {
      const rd = editTask.reminder_date ? editTask.reminder_date.split('T')[0] : ''
      const rt = editTask.reminder_date ? editTask.reminder_date.split('T')[1]?.slice(0, 5) || '' : ''
      setForm({
        title: editTask.title, emoji: editTask.emoji || '',
        category: editTask.category, task_date: editTask.task_date,
        task_time: editTask.task_time || '', notes: editTask.notes || '',
        is_highlighted: editTask.is_highlighted,
        reminder_enabled: !!editTask.reminder_date,
        reminder_date: rd, reminder_time: rt,
      })
    } else {
      setForm({
        title: '', emoji: '', category: 'tarea',
        task_date: prefillDate || '', task_time: '', notes: '',
        is_highlighted: false, reminder_enabled: false,
        reminder_date: prefillDate || '', reminder_time: '09:00',
      })
    }
  }, [editTask, prefillDate])

  const handleSave = async () => {
    if (!form.title.trim() || !form.task_date) return
    setSaving(true)
    let reminder_date: string | null = null
    if (form.reminder_enabled && form.reminder_date) {
      reminder_date = `${form.reminder_date}T${form.reminder_time || '09:00'}:00`
    }
    const payload = {
      event_id: eventId, title: form.title.trim(),
      emoji: form.emoji || null, category: form.category,
      task_date: form.task_date, task_time: form.task_time || null,
      notes: form.notes.trim() || null, is_highlighted: form.is_highlighted,
      reminder_date,
    }
    if (editTask) {
      await supabase.from('event_timeline_tasks').update(payload).eq('id', editTask.id)
    } else {
      await supabase.from('event_timeline_tasks').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  const handleDelete = async () => {
    if (!editTask) return
    await supabase.from('event_timeline_tasks').delete().eq('id', editTask.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1D1E20]">{editTask ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button onClick={onClose} className="text-xl text-[#aaa]">✕</button>
        </div>

        {/* Emoji + Título */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-shrink-0">
            <button onClick={() => setShowEmoji(p => !p)}
              className="w-10 h-10 border border-[#e0e0e0] rounded-xl flex items-center justify-center text-lg hover:bg-[#f8f8f8]">
              {form.emoji || '＋'}
            </button>
            {showEmoji && (
              <div className="absolute top-12 left-0 z-10 bg-white border border-[#e0e0e0] rounded-xl p-2 grid grid-cols-5 gap-1 w-44">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setForm(f => ({ ...f, emoji: e })); setShowEmoji(false) }}
                    className="text-lg hover:bg-[#f8f8f8] rounded-lg p-1">{e}
                  </button>
                ))}
                {form.emoji && (
                  <button onClick={() => { setForm(f => ({ ...f, emoji: '' })); setShowEmoji(false) }}
                    className="col-span-5 text-xs text-[#aaa] hover:text-[#888] pt-1 border-t border-[#e8e8e8] mt-1">
                    Quitar emoji
                  </button>
                )}
              </div>
            )}
          </div>
          <input type="text" placeholder="Título de la tarea" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="flex-1 border border-[#e0e0e0] rounded-xl px-3 text-sm focus:outline-none focus:border-[#48C9B0] h-10 bg-[#f8f8f8]" />
        </div>

        {/* Categoría */}
        <div className="mb-4">
          <label className="text-xs font-medium text-[#555] mb-1.5 block">Categoría</label>
          <div className="relative">
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as TimelineTask['category'] }))}
              className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8]">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-[#aaa] pointer-events-none" />
          </div>
        </div>

        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-[#555] mb-1.5 block">Fecha</label>
            <input type="date" value={form.task_date}
              onChange={e => setForm(f => ({ ...f, task_date: e.target.value }))}
              className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#555] mb-1.5 block">
              Hora <span className="font-normal text-[#ccc]">(opcional)</span>
            </label>
            <input type="time" value={form.task_time}
              onChange={e => setForm(f => ({ ...f, task_time: e.target.value }))}
              className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8]" />
          </div>
        </div>

        {/* Notas */}
        <div className="mb-4">
          <label className="text-xs font-medium text-[#555] mb-1.5 block">
            Notas <span className="font-normal text-[#ccc]">(opcional)</span>
          </label>
          <textarea placeholder="Agrega detalles, instrucciones o recordatorios..."
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2} className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#48C9B0] resize-none bg-[#f8f8f8]" />
        </div>

        {/* Destacar + Recordatorio en una sola fila */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Botón destacar — simple, no toggle */}
          <button
            onClick={() => setForm(f => ({ ...f, is_highlighted: !f.is_highlighted }))}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              form.is_highlighted
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-[#e0e0e0] text-[#888] hover:bg-[#f8f8f8]'
            }`}
          >
            <Star size={14} className={form.is_highlighted ? 'fill-amber-400 text-amber-400' : 'text-[#aaa]'} />
            {form.is_highlighted ? 'Destacada' : 'Destacar'}
          </button>

          {/* Toggle recordatorio */}
          <button
            onClick={() => setForm(f => ({ ...f, reminder_enabled: !f.reminder_enabled }))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${
              form.reminder_enabled
                ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#0F6E56]'
                : 'border-[#e0e0e0] text-[#888] hover:bg-[#f8f8f8]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell size={14} className={form.reminder_enabled ? 'text-[#48C9B0]' : 'text-[#aaa]'} />
              <span>Recordatorio</span>
            </div>
            <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${
              form.reminder_enabled ? 'bg-[#48C9B0]' : 'bg-[#e0e0e0]'
            }`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                form.reminder_enabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>
        </div>

        {/* Expand recordatorio */}
        {form.reminder_enabled && (
          <div className="grid grid-cols-2 gap-3 px-3 pb-3 pt-2 border border-[#48C9B0] rounded-xl mb-4 bg-[#f0fdfb]">
            <div>
              <label className="text-[11px] font-medium text-[#0F6E56] mb-1 block">¿Qué día avisarte?</label>
              <input type="date" value={form.reminder_date}
                onChange={e => setForm(f => ({ ...f, reminder_date: e.target.value }))}
                className="w-full border border-[#9FE1CB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#48C9B0] bg-white" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#0F6E56] mb-1 block">¿A qué hora?</label>
              <input type="time" value={form.reminder_time}
                onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))}
                className="w-full border border-[#9FE1CB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#48C9B0] bg-white" />
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2.5">
          {editTask && (
            <button onClick={handleDelete}
              className="px-4 py-3 text-sm text-[#cc3333] border border-[#ffc0c0] rounded-xl hover:bg-[#fff0f0]">
              Eliminar
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-3 text-sm border border-[#e0e0e0] rounded-xl text-[#888] hover:bg-[#f8f8f8]">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!form.title.trim() || !form.task_date || saving}
            className="flex-[2] py-3 text-sm bg-[#48C9B0] text-white rounded-xl font-semibold disabled:opacity-40 hover:bg-[#3ab89f] transition-colors">
            {saving ? 'Guardando...' : editTask ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DayModalProps {
  dateKey: string
  tasks: TimelineTask[]
  onClose: () => void
  onEdit: (t: TimelineTask) => void
  onToggleCompleted: (t: TimelineTask) => void
  onAddNew: (date: string) => void
}

function DayModal({ dateKey, tasks, onClose, onEdit, onToggleCompleted, onAddNew }: DayModalProps) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const label = `${day} de ${MONTH_NAMES[month - 1]} ${year}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e8e8]">
          <div>
            <p className="text-sm font-bold text-[#1D1E20]">{label}</p>
            <p className="text-[11px] text-[#aaa] mt-0.5">
              {tasks.length === 0 ? 'Sin tareas' : `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={onClose} className="text-xl text-[#aaa]">✕</button>
        </div>

        <div className="max-h-80 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {tasks.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-[#888]">Sin tareas este día</p>
            </div>
          ) : (
            tasks.map(t => {
              const cat = getCat(t.category)
              return (
                <div key={t.id} onClick={() => onEdit(t)}
                  className={['bg-white border rounded-xl p-3 cursor-pointer hover:border-[#48C9B0] transition-all border-[#e8e8e8]', t.is_completed ? 'opacity-50' : ''].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={t.category} />
                    {t.emoji && <span className="text-base flex-shrink-0">{t.emoji}</span>}
                    <span className={`flex-1 text-sm font-semibold ${t.is_completed ? 'line-through text-[#aaa]' : 'text-[#1D1E20]'}`}>{t.title}</span>
                    {t.is_highlighted && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                    <button onClick={e => { e.stopPropagation(); onToggleCompleted(t) }} className="flex-shrink-0">
                      {t.is_completed ? <CheckCircle2 size={15} className="text-[#48C9B0]" /> : <Circle size={15} className="text-[#ccc]" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                    {t.task_time && <span className="text-[11px] text-[#aaa]">{formatTime(t.task_time)}</span>}
                    {t.reminder_date && (
                      <span className="flex items-center gap-0.5 text-[10px] text-[#48C9B0]">
                        <Bell size={10} />Recordatorio {formatDate(t.reminder_date.split('T')[0])}
                      </span>
                    )}
                  </div>
                  {t.notes && <p className="mt-1.5 text-[11px] text-[#888] leading-relaxed line-clamp-2">{t.notes}</p>}
                  <button onClick={e => { e.stopPropagation(); openGoogleCalendar(t) }}
                    className="flex items-center gap-1 mt-2 text-[11px] text-[#aaa] hover:text-[#48C9B0] transition-colors">
                    <Calendar size={11} />Agregar a Google Calendar
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-[#e8e8e8]">
          <button onClick={() => onAddNew(dateKey)}
            className="flex items-center gap-1.5 w-full justify-center py-2.5 text-sm font-semibold text-[#48C9B0] border border-dashed border-[#48C9B0] rounded-xl hover:bg-[#f0fdfb] transition-colors">
            <Plus size={13} />Agregar tarea este día
          </button>
        </div>
      </div>
    </div>
  )
}

interface FilterDrawerProps {
  search: string
  category: string
  onSearch: (v: string) => void
  onCategory: (v: string) => void
  onClose: () => void
  onClear: () => void
}

function FilterDrawer({ search, category, onSearch, onCategory, onClose, onClear }: FilterDrawerProps) {
  const hasFilters = search.trim() !== '' || category !== ''
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#1D1E20]">Filtrar</h2>
          <button onClick={onClose} className="text-xl text-[#aaa]">✕</button>
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium text-[#555] mb-1.5 block">Buscar</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
            <input type="text" value={search} onChange={e => onSearch(e.target.value)}
              placeholder="Título o notas..."
              className="w-full border border-[#e0e0e0] rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8]" />
            {search && (
              <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb]">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="mb-6">
          <label className="text-xs font-medium text-[#555] mb-1.5 block">Categoría</label>
          <div className="relative">
            <select value={category} onChange={e => onCategory(e.target.value)}
              className="w-full border border-[#e0e0e0] rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8]">
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-3 text-[#aaa] pointer-events-none" />
          </div>
        </div>
        <div className="flex gap-2.5">
          {hasFilters && (
            <button onClick={onClear} className="flex-1 py-2.5 text-sm border border-[#e0e0e0] rounded-xl text-[#888] hover:bg-[#f8f8f8]">
              Limpiar
            </button>
          )}
          <button onClick={onClose} className="flex-[2] py-2.5 text-sm bg-[#48C9B0] text-white rounded-xl font-semibold hover:bg-[#3ab89f]">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TimelinePage() {
  const searchParams            = useSearchParams()
  const { id: eventId }         = useParams<{ id: string }>()
  const router                  = useRouter()
  const [tasks, setTasks]             = useState<TimelineTask[]>([])
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState<'lista' | 'calendario'>('lista')
  const [showModal, setShowModal]     = useState(false)
  const [editTask, setEditTask]       = useState<TimelineTask | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calMonth, setCalMonth]       = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [search, setSearch]           = useState('')
  const [filterCat, setFilterCat]     = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = search.trim() !== '' || filterCat !== ''

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) router.replace('/')
      else if (session) fetchTasks()
    })
    return () => subscription.unsubscribe()
  }, [eventId])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('event_timeline_tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('task_date', { ascending: true })
      .order('task_time', { ascending: true, nullsFirst: true })
    setTasks(data || [])
    setLoading(false)
  }, [eventId])

  const openNew     = (date?: string) => { setEditTask(null); setPrefillDate(date || null); setShowModal(true) }
  const openEdit    = (t: TimelineTask) => { setEditTask(t); setPrefillDate(null); setShowModal(true) }
  const closeModal  = () => { setShowModal(false); setEditTask(null); setPrefillDate(null) }
  const handleSaved = () => { closeModal(); fetchTasks(); setSelectedDay(null) }

  useEffect(() => {
    if (!tasks.length) return
    const taskId = searchParams.get('task')
    if (!taskId) return
    const found = tasks.find(t => t.id === taskId)
    if (found) {
      openEdit(found)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [tasks])

  const toggleCompleted = async (t: TimelineTask) => {
    await supabase.from('event_timeline_tasks').update({ is_completed: !t.is_completed }).eq('id', t.id)
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, is_completed: !x.is_completed } : x))
  }

  const clearFilters = () => { setSearch(''); setFilterCat('') }

  const total       = tasks.length
  const completed   = tasks.filter(t => t.is_completed).length
  const pending     = tasks.filter(t => !t.is_completed).length
  const highlighted = tasks.filter(t => t.is_highlighted).length
  const grouped     = groupByMonth(useMemo(() => {
    let result = tasks
    if (filterCat) result = result.filter(t => t.category === filterCat)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q)))
    }
    return result
  }, [tasks, filterCat, search]))

  const filteredTasks = useMemo(() => {
    let result = tasks
    if (filterCat) result = result.filter(t => t.category === filterCat)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q)))
    }
    return result
  }, [tasks, filterCat, search])

  const calDays = () => {
    const { year, month } = calMonth
    return { firstDay: new Date(year, month, 1).getDay(), daysInMonth: new Date(year, month + 1, 0).getDate() }
  }

  const tasksByDay = (day: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const key = `${calMonth.year}-${pad(calMonth.month + 1)}-${pad(day)}`
    return tasks.filter(t => t.task_date === key)
  }

  const selectedDayTasks = selectedDay ? filteredTasks.filter(t => t.task_date === selectedDay) : []

  const ListView = () => {
    if (filteredTasks.length === 0) {
      return (
        <div className="mt-5 rounded-xl border border-dashed border-[#e0e0e0] px-6 py-14 text-center">
          <div className="mb-3 text-3xl">{hasActiveFilters ? '🔍' : '📅'}</div>
          <p className="text-sm text-[#888]">{hasActiveFilters ? 'Sin resultados para estos filtros' : 'Sin tareas en el timeline'}</p>
          {hasActiveFilters
            ? <button onClick={clearFilters} className="mt-3 text-sm text-[#48C9B0] font-medium hover:underline">Limpiar filtros</button>
            : <button onClick={() => openNew()} className="mt-4 rounded-lg bg-[#48C9B0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3ab89f]">+ Agregar tarea</button>
          }
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-0">
        {Object.entries(grouped).map(([key, monthTasks]) => {
          const [year, month] = key.split('-').map(Number)
          return (
            <div key={key}>
              <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-widest pl-14 py-2">
                {MONTH_NAMES[month - 1]} {year}
              </p>
              {monthTasks.map((t, i) => (
                <div key={t.id} className="flex gap-0 items-stretch">
                  <div className="w-14 flex flex-col items-center flex-shrink-0">
                    <div className={`w-px bg-[#e8e8e8] ${i === 0 ? 'min-h-[10px]' : 'min-h-[14px]'} flex-shrink-0`} />
                    <CategoryIcon category={t.category} />
                    <div className="w-px bg-[#e8e8e8] flex-1 min-h-[16px]" />
                  </div>
                  <TaskCard t={t} onEdit={openEdit} onToggleCompleted={toggleCompleted} />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  const CalendarView = () => {
    const { firstDay, daysInMonth } = calDays()
    const blanks = Array(firstDay).fill(null)
    const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const pad    = (n: number) => n.toString().padStart(2, '0')
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888] hover:border-[#48C9B0] hover:text-[#48C9B0] transition">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-bold text-[#1D1E20]">{MONTH_NAMES[calMonth.month]} {calMonth.year}</span>
          <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e0e0e0] text-[#888] hover:border-[#48C9B0] hover:text-[#48C9B0] transition">
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => <div key={d} className="text-[11px] font-semibold text-[#aaa] text-center py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => <div key={`b${i}`} />)}
          {days.map(day => {
            const dayTasks = tasksByDay(day)
            const dateKey  = `${calMonth.year}-${pad(calMonth.month + 1)}-${pad(day)}`
            const isToday  = dateKey === new Date().toISOString().split('T')[0]
            const hasTasks = dayTasks.length > 0
            return (
              <button key={day} onClick={() => setSelectedDay(dateKey)}
                className={['relative flex flex-col items-center rounded-xl p-1 min-h-[64px] transition-all border border-transparent', hasTasks ? 'hover:border-[#48C9B0] hover:bg-[#f0fdfb]' : 'hover:bg-[#f8f8f8]'].join(' ')}
              >
                <span className={['text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0', isToday ? 'bg-[#48C9B0] text-white' : 'text-[#1D1E20]'].join(' ')}>
                  {day}
                </span>
                {hasTasks && (
                  <div className="flex flex-col gap-0.5 w-full mt-1 items-center">
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id} className={`flex items-center gap-1 w-full px-0.5 ${t.is_completed ? 'opacity-30' : ''}`}>
                        <CalendarTaskIcon category={t.category} />
                        <span className="hidden sm:block text-[10px] text-[#888] truncate leading-tight flex-1 min-w-0">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && <span className="text-[9px] text-[#aaa] mt-0.5">+{dayTasks.length - 3}</span>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'visible', background: '#ffffff', color: '#1D1E20' }}>
      <div style={{ flexShrink: 0, borderBottom: '1px solid #e8e8e8' }} className="px-4 pt-4 pb-0 sm:px-6 sm:pt-5 lg:px-10 lg:pt-6">
        <div className="mb-4">
          <h1 className="text-lg font-bold text-[#1D1E20] sm:text-xl lg:text-2xl">Timeline</h1>
          <p className="mt-0.5 text-xs text-[#888] sm:text-sm">Planea tu evento desde el save the date hasta la torna boda</p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'Total',       value: total,       color: '#1D1E20' },
            { label: 'Pendientes',  value: pending,     color: '#1D1E20' },
            { label: 'Completadas', value: completed,   color: '#2a7a50' },
            { label: 'Destacadas',  value: highlighted, color: '#b8860b' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-[#e8e8e8] bg-[#f8f8f8] p-2 text-center">
              <div className="text-lg font-bold sm:text-xl" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] text-[#999]">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[#e0e0e0]">
            <button onClick={() => setView('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${view === 'lista' ? 'bg-[#1D1E20] text-white' : 'text-[#888] hover:bg-[#f5f5f5]'}`}>
              <LayoutList width={13} height={13} /><span>Lista</span>
            </button>
            <button onClick={() => setView('calendario')}
              className={`flex items-center gap-1.5 border-l border-[#e0e0e0] px-3 py-1.5 text-xs font-medium transition ${view === 'calendario' ? 'bg-[#1D1E20] text-white' : 'text-[#888] hover:bg-[#f5f5f5]'}`}>
              <CalendarDays width={13} height={13} /><span>Calendario</span>
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar en título o notas..."
                className="w-full border border-[#e0e0e0] rounded-lg pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8]" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#888]">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="relative">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-[#e0e0e0] rounded-lg pl-3 pr-8 py-1.5 text-xs appearance-none focus:outline-none focus:border-[#48C9B0] bg-[#f8f8f8] text-[#888]">
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-[#aaa] hover:text-[#cc3333] transition-colors whitespace-nowrap">Limpiar</button>
            )}
          </div>
          <button onClick={() => setShowFilters(true)}
            className={['sm:hidden flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition', hasActiveFilters ? 'border-[#48C9B0] bg-[#f0fdfb] text-[#1a9e88]' : 'border-[#e0e0e0] text-[#888] hover:bg-[#f5f5f5]'].join(' ')}>
            <SlidersHorizontal width={13} height={13} />
            Filtrar
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#48C9B0] text-[9px] font-bold text-white">
                {(search ? 1 : 0) + (filterCat ? 1 : 0)}
              </span>
            )}
          </button>
          <div className="ml-auto">
            <button onClick={() => openNew()}
              className="flex items-center gap-1.5 rounded-lg bg-[#48C9B0] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#3ab89f] sm:px-4 sm:text-sm">
              <Plus width={14} height={14} />Agregar
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }} className="px-4 pb-6 pt-4 sm:px-6 lg:px-10">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e8e8e8] border-t-[#48C9B0]" />
              <p className="text-sm text-[#999]">Cargando...</p>
            </div>
          </div>
        ) : view === 'lista' ? <ListView /> : <CalendarView />}
      </div>

      {showModal && (
        <TaskModal editTask={editTask} prefillDate={prefillDate}
          onClose={closeModal} onSaved={handleSaved} eventId={eventId} />
      )}
      {selectedDay && (
        <DayModal dateKey={selectedDay} tasks={selectedDayTasks}
          onClose={() => setSelectedDay(null)}
          onEdit={t => { setSelectedDay(null); openEdit(t) }}
          onToggleCompleted={toggleCompleted}
          onAddNew={date => { setSelectedDay(null); openNew(date) }} />
      )}
      {showFilters && (
        <FilterDrawer search={search} category={filterCat}
          onSearch={setSearch} onCategory={setFilterCat}
          onClose={() => setShowFilters(false)}
          onClear={clearFilters} />
      )}
    </div>
  )
}
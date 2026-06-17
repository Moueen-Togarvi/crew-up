'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Check,
  Trash2,
  Pencil,
  Loader2,
  Milestone as MilestoneIcon,
  Calendar,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react'

export interface Milestone {
  id: string
  jobId: string
  title: string
  description: string | null
  dueOffset: number
  completed: boolean
  completedAt: string | null
  order: number
  createdAt: string
}

interface MilestoneTrackerProps {
  jobId: string
  /** can the current user add/edit/delete milestones? (contractor who owns the job) */
  isOwner: boolean
  /** OPEN | ASSIGNED | COMPLETED | CANCELLED */
  jobStatus: string
}

function formatDay(offset: number): string {
  if (offset <= 0) return 'Day 0 · Start'
  if (offset === 1) return 'Day 1'
  return `Day ${offset}`
}

function formatCompletedAt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function MilestoneTracker({ jobId, isOwner, jobStatus }: MilestoneTrackerProps) {
  const { toast } = useToast()

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add form state
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addDueOffset, setAddDueOffset] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit state — holds the id of the milestone being edited inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueOffset, setEditDueOffset] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Toggling completion state per-milestone to show spinner in the dot
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Editing is allowed for owners on OPEN / ASSIGNED jobs (not COMPLETED or CANCELLED)
  const canEdit = isOwner && (jobStatus === 'OPEN' || jobStatus === 'ASSIGNED')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api<{ milestones: Milestone[] }>(`/api/jobs/${jobId}/milestones`)
      setMilestones(data.milestones)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    load()
  }, [load])

  const completedCount = milestones.filter((m) => m.completed).length
  const totalCount = milestones.length
  const progressPct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const dueOffset = addDueOffset === '' ? 0 : Math.max(0, parseInt(addDueOffset, 10) || 0)
      const data = await api<{ milestone: Milestone }>(`/api/jobs/${jobId}/milestones`, {
        method: 'POST',
        body: {
          title: addTitle.trim(),
          description: addDescription.trim() || undefined,
          dueOffset,
        },
      })
      setMilestones((prev) => [...prev, data.milestone].sort((a, b) => a.order - b.order))
      setAddTitle('')
      setAddDescription('')
      setAddDueOffset('')
      setShowAdd(false)
      toast({ title: 'Milestone added', description: data.milestone.title })
    } catch (e) {
      toast({ title: 'Failed to add milestone', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id)
    setEditTitle(m.title)
    setEditDescription(m.description ?? '')
    setEditDueOffset(String(m.dueOffset))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
    setEditDueOffset('')
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' })
      return
    }
    setSavingEdit(true)
    try {
      const dueOffset = editDueOffset === '' ? 0 : Math.max(0, parseInt(editDueOffset, 10) || 0)
      const data = await api<{ milestone: Milestone }>(`/api/milestones/${id}`, {
        method: 'PATCH',
        body: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          dueOffset,
        },
      })
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? data.milestone : m)).sort((a, b) => a.order - b.order),
      )
      cancelEdit()
      toast({ title: 'Milestone updated' })
    } catch (e) {
      toast({ title: 'Failed to update milestone', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function toggleComplete(m: Milestone) {
    setTogglingId(m.id)
    try {
      const data = await api<{ milestone: Milestone }>(`/api/milestones/${m.id}`, {
        method: 'PATCH',
        body: { completed: !m.completed },
      })
      setMilestones((prev) =>
        prev.map((x) => (x.id === m.id ? data.milestone : x)).sort((a, b) => a.order - b.order),
      )
      toast({
        title: data.milestone.completed ? 'Milestone complete ✅' : 'Milestone reopened',
        description: data.milestone.title,
      })
    } catch (e) {
      toast({ title: 'Failed to update milestone', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(m: Milestone) {
    setDeletingId(m.id)
    try {
      await api<{ ok: boolean }>(`/api/milestones/${m.id}`, { method: 'DELETE' })
      setMilestones((prev) => prev.filter((x) => x.id !== m.id))
      toast({ title: 'Milestone deleted', description: m.title })
    } catch (e) {
      toast({ title: 'Failed to delete milestone', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <MilestoneIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Project milestones</CardTitle>
              <CardDescription className="text-xs">
                Track key checkpoints for this job
              </CardDescription>
            </div>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant={showAdd ? 'outline' : 'default'}
              onClick={() => setShowAdd((s) => !s)}
              className="gap-1.5 shrink-0"
            >
              {showAdd ? (
                <>
                  <X className="h-4 w-4" /> Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Add milestone
                </>
              )}
            </Button>
          )}
        </div>

        {totalCount > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {completedCount} of {totalCount} complete
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  'font-semibold tabular-nums',
                  progressPct === 100
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                )}
              >
                {progressPct}%
              </Badge>
            </div>
            <Progress
              value={progressPct}
              className={cn('h-2', progressPct === 100 && '[&>[data-slot=progress-indicator]]:bg-emerald-500')}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Add milestone form — collapsible */}
        {canEdit && showAdd && (
          <form
            onSubmit={handleAdd}
            className="mb-5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 animate-fade-in-up"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ms-title" className="text-xs font-semibold">
                  Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="ms-title"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. Foundation poured"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ms-desc" className="text-xs font-semibold">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="ms-desc"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Brief notes about this checkpoint…"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ms-due" className="text-xs font-semibold">
                    Due day (offset)
                  </Label>
                  <Input
                    id="ms-due"
                    type="number"
                    min={0}
                    value={addDueOffset}
                    onChange={(e) => setAddDueOffset(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={submitting} className="w-full gap-1.5">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Adding…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" /> Add milestone
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Day offset is counted from job assignment. Use 0 for kickoff tasks.
              </p>
            </div>
          </form>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-sm">Loading milestones…</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-600 dark:text-rose-400">
            Failed to load milestones: {error}
          </div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <MilestoneIcon className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium">No milestones yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs">
              {canEdit
                ? 'Add the first milestone to start tracking this job\u2019s progress.'
                : 'The contractor hasn\u2019t added any milestones for this job yet.'}
            </p>
            {canEdit && !showAdd && (
              <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4" /> Add the first milestone
              </Button>
            )}
          </div>
        ) : (
          <ol className="relative">
            {milestones.map((m, idx) => {
              const isEditing = editingId === m.id
              const isLast = idx === milestones.length - 1
              const isToggling = togglingId === m.id
              const isDeleting = deletingId === m.id

              return (
                <li
                  key={m.id}
                  className="relative pl-9 animate-stagger-in"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Vertical connector line */}
                  {!isLast && (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute left-[13px] top-7 bottom-0 w-0.5',
                        m.completed ? 'bg-emerald-500/40' : 'bg-border',
                      )}
                    />
                  )}

                  {/* Dot / check */}
                  <button
                    type="button"
                    disabled={!canEdit || isToggling}
                    onClick={() => canEdit && toggleComplete(m)}
                    aria-label={m.completed ? 'Mark as pending' : 'Mark as complete'}
                    className={cn(
                      'absolute left-0 top-1.5 grid h-7 w-7 place-items-center rounded-full border-2 transition-all',
                      canEdit && 'cursor-pointer hover:scale-110',
                      !canEdit && 'cursor-default',
                      m.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : 'border-amber-500/60 bg-background text-amber-500',
                      isToggling && 'opacity-60',
                    )}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : m.completed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                  </button>

                  {/* Card / content */}
                  <div
                    className={cn(
                      'mb-3 rounded-xl border p-3.5 transition-colors',
                      m.completed
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border bg-card',
                    )}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5 animate-fade-in">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`edit-due-${m.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                            Day:
                          </Label>
                          <Input
                            id={`edit-due-${m.id}`}
                            type="number"
                            min={0}
                            value={editDueOffset}
                            onChange={(e) => setEditDueOffset(e.target.value)}
                            className="h-8 w-24 text-sm"
                          />
                          <div className="ml-auto flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 px-2 text-xs">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(m.id)}
                              disabled={savingEdit}
                              className="h-8 gap-1.5 text-xs"
                            >
                              {savingEdit ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4
                              className={cn(
                                'text-sm font-semibold leading-snug',
                                m.completed && 'text-muted-foreground line-through',
                              )}
                            >
                              {m.title}
                            </h4>
                            {m.completed ? (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1 px-1.5"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Done
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] gap-1 px-1.5"
                              >
                                <Circle className="h-3 w-3" /> Pending
                              </Badge>
                            )}
                          </div>
                          {m.description && (
                            <p
                              className={cn(
                                'mt-1 text-xs leading-relaxed text-muted-foreground',
                                m.completed && 'opacity-70',
                              )}
                            >
                              {m.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDay(m.dueOffset)}
                            </span>
                            {m.completed && m.completedAt && (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Check className="h-3 w-3" />
                                Completed {formatCompletedAt(m.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(m)}
                              aria-label="Edit milestone"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                              onClick={() => handleDelete(m)}
                              disabled={isDeleting}
                              aria-label="Delete milestone"
                              title="Delete"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

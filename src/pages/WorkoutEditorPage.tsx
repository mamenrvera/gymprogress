import { useParams, useNavigate } from 'react-router-dom'
import { WorkoutEditor } from '../components/training/WorkoutEditor'

export function WorkoutEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  if (!id) return null
  return (
    <div className="animate-fade-up">
      <WorkoutEditor workoutId={id} onClose={() => navigate('/entrenamiento')} />
    </div>
  )
}

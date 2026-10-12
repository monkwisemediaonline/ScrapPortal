import ActionForm from '@/components/ActionForm'
import { createCategory, createGrade, toggleCatalog } from '@/app/actions/admin'
import { requireAdmin } from '@/lib/auth'
import type { Category, Grade } from '@/lib/types'

export default async function AdminCatalog() {
  const { supabase } = await requireAdmin()
  const [{ data: cats }, { data: grades }] = await Promise.all([
    supabase.from('categories').select('*').order('sort'),
    supabase.from('grades').select('*').order('sort'),
  ])
  const categories = (cats ?? []) as Category[]

  return (
    <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">
      <div className="space-y-4">
        <h1 className="font-display font-extrabold text-2xl">Catalog</h1>
        {categories.map((c) => (
          <section key={c.id} className={`card overflow-hidden ${c.active ? '' : 'opacity-60'}`}>
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <h2 className="font-semibold">
                {c.name_en} <span className="text-sm font-normal text-muted">{c.name_hi} · {c.name_pa}</span>
              </h2>
              <form action={toggleCatalog.bind(null, 'categories', c.id, !c.active)}>
                <button className="text-xs underline text-muted">{c.active ? 'Hide' : 'Show'}</button>
              </form>
            </div>
            <ul className="divide-y divide-line">
              {((grades ?? []) as Grade[]).filter((g) => g.category_id === c.id).map((g) => (
                <li key={g.id} className={`px-4 py-2 flex items-center gap-3 text-sm ${g.active ? '' : 'opacity-50'}`}>
                  <span className="flex-1">
                    {g.name_en} <span className="text-muted">/{g.unit}</span>
                    <span className="block text-xs text-muted">{g.name_hi} · {g.name_pa} · {g.slug}</span>
                  </span>
                  <form action={toggleCatalog.bind(null, 'grades', g.id, !g.active)}>
                    <button className="text-xs underline text-muted">{g.active ? 'Hide' : 'Show'}</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Add grade</h2>
          <ActionForm action={createGrade} submitLabel="Add grade" className="space-y-2">
            <select name="category_id" className="input" required defaultValue="">
              <option value="" disabled>Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
            <input name="name_en" className="input" placeholder="Name (English)" required />
            <input name="name_hi" className="input" placeholder="नाम (हिंदी)" />
            <input name="name_pa" className="input" placeholder="ਨਾਮ (ਪੰਜਾਬੀ)" />
            <input name="description" className="input" placeholder="Description / spec (optional)" />
            <div className="grid grid-cols-2 gap-2">
              <select name="unit" className="input" defaultValue="kg">
                <option value="kg">per kg</option>
                <option value="tonne">per tonne</option>
                <option value="piece">per piece</option>
              </select>
              <input name="sort" type="number" className="input" placeholder="Sort order" />
            </div>
          </ActionForm>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Add category</h2>
          <ActionForm action={createCategory} submitLabel="Add category" className="space-y-2">
            <input name="name_en" className="input" placeholder="Name (English)" required />
            <input name="name_hi" className="input" placeholder="नाम (हिंदी)" />
            <input name="name_pa" className="input" placeholder="ਨਾਮ (ਪੰਜਾਬੀ)" />
            <input name="sort" type="number" className="input" placeholder="Sort order" />
          </ActionForm>
        </div>
      </div>
    </div>
  )
}

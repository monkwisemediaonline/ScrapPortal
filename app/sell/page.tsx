import type { Metadata } from 'next'
import ActionForm from '@/components/ActionForm'
import GradeSelect from '@/components/GradeSelect'
import PhotoInput from '@/components/PhotoInput'
import { createSellRequest } from '@/app/actions/member'
import { requireMember } from '@/lib/auth'
import { getBoard } from '@/lib/data'
import { bestRateLabels, gradeGroups } from '@/lib/catalog-ui'
import { getDict } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Sell at daily rate' }

export default async function SellPage({ searchParams }: PageProps<'/sell'>) {
  const { grade } = await searchParams
  const { profile } = await requireMember()
  const [{ t, locale }, { categories, entries }] = await Promise.all([getDict(), getBoard()])
  const grades = entries.map((e) => e.grade)
  const preselected = grades.find((g) => g.slug === grade)?.id

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display font-extrabold text-2xl">{t.sell.title}</h1>
      <p className="text-muted text-sm mt-1 mb-6">{t.sell.sub}</p>
      <div className="card p-5 md:p-6">
        <ActionForm action={createSellRequest} submitLabel={t.sell.submit} submitClass="btn btn-primary w-full">
          <GradeSelect
            groups={gradeGroups(categories, grades, locale)}
            defaultValue={preselected}
            label={t.common.grade}
            rates={bestRateLabels(entries, t)}
            rateLabel={t.sell.rateNow}
          />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="label" htmlFor="quantity">{t.common.quantity}</label>
              <input id="quantity" name="quantity" type="number" min="0" step="any" inputMode="decimal" className="input tabular" required />
            </div>
            <div>
              <label className="label" htmlFor="quantity_unit">{t.common.unit}</label>
              <select id="quantity_unit" name="quantity_unit" className="input" defaultValue="kg">
                <option value="kg">{t.units.kg}</option>
                <option value="tonne">{t.units.tonne}</option>
                <option value="piece">{t.units.piece}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="area">{t.common.area}</label>
            <input id="area" name="area" className="input" required defaultValue={profile.area ?? ''} placeholder={t.common.areaHint} />
          </div>
          <div>
            <label className="label" htmlFor="pickup_address">{t.sell.pickupAddress}</label>
            <textarea id="pickup_address" name="pickup_address" className="input" defaultValue={profile.address ?? ''} />
          </div>
          <div>
            <span className="label">{t.common.photos} <span className="font-normal text-muted">({t.common.optional})</span></span>
            <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} />
          </div>
          <div>
            <label className="label" htmlFor="notes">{t.common.notes} <span className="font-normal text-muted">({t.common.optional})</span></label>
            <textarea id="notes" name="notes" className="input" />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}

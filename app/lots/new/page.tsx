import type { Metadata } from 'next'
import ActionForm from '@/components/ActionForm'
import GradeSelect from '@/components/GradeSelect'
import PhotoInput from '@/components/PhotoInput'
import { createLot } from '@/app/actions/member'
import { requireMember, canSell } from '@/lib/auth'
import { getBoard } from '@/lib/data'
import { bestRateLabels, gradeGroups } from '@/lib/catalog-ui'
import { getDict } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Auction a lot' }

const DURATIONS = [6, 12, 24, 48, 72, 168]

export default async function NewLotPage() {
  const { profile } = await requireMember()
  const [{ t, locale }, { categories, entries }] = await Promise.all([getDict(), getBoard()])
  const l = t.lots

  if (!canSell(profile)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="card bg-warn-soft border-transparent p-5">{l.needApprovalSell}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display font-extrabold text-2xl mb-6">{l.createTitle}</h1>
      <div className="card p-5 md:p-6">
        <ActionForm action={createLot} submitLabel={l.create} submitClass="btn btn-primary w-full">
          <GradeSelect
            groups={gradeGroups(categories, entries.map((e) => e.grade), locale)}
            label={t.common.grade}
            rates={bestRateLabels(entries, t)}
            rateLabel={t.sell.rateNow}
          />
          <div>
            <label className="label" htmlFor="title">{l.lotTitle}</label>
            <input id="title" name="title" className="input" required placeholder={l.lotTitleHint} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="label" htmlFor="quantity">{t.common.quantity}</label>
              <input id="quantity" name="quantity" type="number" min="0" step="any" inputMode="decimal" className="input tabular" required />
            </div>
            <div>
              <label className="label" htmlFor="quantity_unit">{t.common.unit}</label>
              <select id="quantity_unit" name="quantity_unit" className="input" defaultValue="tonne">
                <option value="kg">{t.units.kg}</option>
                <option value="tonne">{t.units.tonne}</option>
                <option value="piece">{t.units.piece}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="price_unit">{l.priceUnit}</label>
              <select id="price_unit" name="price_unit" className="input" defaultValue="kg">
                <option value="kg">₹ / {t.units.kg}</option>
                <option value="tonne">₹ / {t.units.tonne}</option>
                <option value="piece">₹ / {t.units.piece}</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="min_rate">{l.minRate} <span className="font-normal text-muted">({t.common.optional})</span></label>
              <input id="min_rate" name="min_rate" type="number" min="0" step="any" inputMode="decimal" className="input tabular" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="duration_hours">{l.duration}</label>
            <select id="duration_hours" name="duration_hours" className="input" defaultValue="48">
              {DURATIONS.map((h) => (
                <option key={h} value={h}>{h < 24 ? `${h} ${l.hours}` : `${h / 24} ${l.days}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="area">{t.common.area}</label>
            <input id="area" name="area" className="input" required defaultValue={profile.area ?? ''} placeholder={t.common.areaHint} />
          </div>
          <div>
            <label className="label" htmlFor="inspection_note">{l.inspection} <span className="font-normal text-muted">({t.common.optional})</span></label>
            <input id="inspection_note" name="inspection_note" className="input" placeholder={l.inspectionHint} />
          </div>
          <div>
            <label className="label" htmlFor="description">{l.description} <span className="font-normal text-muted">({t.common.optional})</span></label>
            <textarea id="description" name="description" className="input" placeholder={l.descriptionHint} />
          </div>
          <div>
            <span className="label">{t.common.photos}</span>
            <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}

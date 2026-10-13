import ActionForm from './ActionForm'
import { Choice, PageBanner, Step } from './Blocks'
import GradeSelect, { type GradeGroup } from './GradeSelect'
import PhotoInput from './PhotoInput'
import { createLot, createSellRequest } from '@/app/actions/member'
import type { Dict } from '@/lib/i18n'

type Common = {
  t: Dict
  groups: GradeGroup[]
  rates: Record<string, string>
  area: string
  address: string
}

const optional = (t: Dict) => <span className="font-normal text-muted">({t.common.optional})</span>

/** "Sell at today's rate" as four plain questions. */
export function SellForm({ t, groups, rates, area, address, preselected }: Common & { preselected?: string }) {
  const units = [
    { value: 'kg', label: t.units.kg },
    { value: 'tonne', label: t.units.tonne },
    { value: 'piece', label: t.units.piece },
  ]
  return (
    <div className="mx-auto max-w-2xl px-4 lg:px-6 py-6 space-y-4">
      <PageBanner color="grad-green" icon="tag" title={t.sell.title} sub={t.sell.sub} />
      <ActionForm action={createSellRequest} submitLabel={`✓ ${t.sell.submit}`} submitClass="btn btn-success w-full min-h-14! text-lg!" className="space-y-4">
        <Step n={1} tone="tone-green" title={t.sell.step1}>
          <GradeSelect groups={groups} defaultValue={preselected} label={t.common.grade} rates={rates} rateLabel={t.sell.rateNow} noRateLabel={t.sell.noRate} />
        </Step>
        <Step n={2} tone="tone-blue" title={t.sell.step2}>
          <div>
            <label className="label" htmlFor="quantity">{t.common.quantity}</label>
            <input id="quantity" name="quantity" type="number" min="0" step="any" inputMode="decimal" className="input tabular text-xl! min-h-14!" required />
          </div>
          <Choice name="quantity_unit" label={t.common.unit} options={units} defaultValue="kg" />
        </Step>
        <Step n={3} tone="tone-orange" title={t.sell.step3}>
          <div>
            <label className="label" htmlFor="area">{t.common.area}</label>
            <input id="area" name="area" className="input" required defaultValue={area} placeholder={t.common.areaHint} />
          </div>
          <div>
            <label className="label" htmlFor="pickup_address">{t.sell.pickupAddress}</label>
            <textarea id="pickup_address" name="pickup_address" className="input" defaultValue={address} />
          </div>
        </Step>
        <Step n={4} tone="tone-purple" title={t.sell.step4}>
          <div>
            <span className="label">{t.common.photos} {optional(t)}</span>
            <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} />
          </div>
          <div>
            <label className="label" htmlFor="notes">{t.common.notes} {optional(t)}</label>
            <textarea id="notes" name="notes" className="input" />
          </div>
        </Step>
      </ActionForm>
    </div>
  )
}

const DURATIONS = [6, 12, 24, 48, 72, 168]

/** "Auction my scrap" as four plain questions. */
export function LotForm({ t, groups, rates, area }: Common) {
  const l = t.lots
  const qtyUnits = [
    { value: 'tonne', label: t.units.tonne },
    { value: 'kg', label: t.units.kg },
    { value: 'piece', label: t.units.piece },
  ]
  const priceUnits = [
    { value: 'kg', label: `₹ / ${t.units.kg}` },
    { value: 'tonne', label: `₹ / ${t.units.tonne}` },
    { value: 'piece', label: `₹ / ${t.units.piece}` },
  ]
  return (
    <div className="mx-auto max-w-2xl px-4 lg:px-6 py-6 space-y-4">
      <PageBanner color="grad-orange" icon="gavel" title={l.createTitle} sub={`${l.how1} ${l.how2} ${l.how3}`} />
      <ActionForm action={createLot} submitLabel={`✓ ${l.create}`} submitClass="btn btn-success w-full min-h-14! text-lg!" className="space-y-4">
        <Step n={1} tone="tone-orange" title={l.step1}>
          <GradeSelect groups={groups} label={t.common.grade} rates={rates} rateLabel={t.sell.rateNow} />
          <div>
            <label className="label" htmlFor="title">{l.lotTitle}</label>
            <input id="title" name="title" className="input" required placeholder={l.lotTitleHint} />
          </div>
        </Step>
        <Step n={2} tone="tone-blue" title={l.step2}>
          <div>
            <label className="label" htmlFor="quantity">{t.common.quantity}</label>
            <input id="quantity" name="quantity" type="number" min="0" step="any" inputMode="decimal" className="input tabular text-xl! min-h-14!" required />
          </div>
          <Choice name="quantity_unit" label={t.common.unit} options={qtyUnits} defaultValue="tonne" />
          <Choice name="price_unit" label={l.priceUnit} options={priceUnits} defaultValue="kg" />
          <div>
            <label className="label" htmlFor="min_rate">{l.minRate} (₹) {optional(t)}</label>
            <input id="min_rate" name="min_rate" type="number" min="0" step="any" inputMode="decimal" className="input tabular" />
          </div>
        </Step>
        <Step n={3} tone="tone-green" title={l.step3}>
          <div>
            <label className="label" htmlFor="area">{t.common.area}</label>
            <input id="area" name="area" className="input" required defaultValue={area} placeholder={t.common.areaHint} />
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
            <label className="label" htmlFor="inspection_note">{l.inspection} {optional(t)}</label>
            <input id="inspection_note" name="inspection_note" className="input" placeholder={l.inspectionHint} />
          </div>
        </Step>
        <Step n={4} tone="tone-purple" title={l.step4}>
          <div>
            <span className="label">{t.common.photos}</span>
            <PhotoInput label={t.common.addPhotos} uploadingLabel={t.common.uploading} />
          </div>
          <div>
            <label className="label" htmlFor="description">{l.description} {optional(t)}</label>
            <textarea id="description" name="description" className="input" placeholder={l.descriptionHint} />
          </div>
        </Step>
      </ActionForm>
    </div>
  )
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ActionForm from '@/components/ActionForm'
import { completeOnboarding } from '@/app/actions/member'
import { getProfile } from '@/lib/auth'
import { getDict } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Your business' }

export default async function OnboardingPage() {
  const [{ t }, { profile }] = await Promise.all([getDict(), getProfile()])
  if (!profile) redirect('/login?next=/onboarding')
  if (profile.status !== 'incomplete') redirect('/dashboard')
  const o = t.onboarding

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="font-display font-extrabold text-2xl">{o.title}</h1>
      <p className="text-muted text-sm mt-1 mb-6">{o.sub}</p>
      <div className="card p-5 md:p-6">
        <ActionForm action={completeOnboarding} submitLabel={o.submit} submitClass="btn btn-primary w-full">
          <div>
            <label className="label" htmlFor="full_name">{o.fullName}</label>
            <input id="full_name" name="full_name" className="input" required defaultValue={profile.full_name ?? ''} />
          </div>
          <div>
            <label className="label" htmlFor="phone">{o.phone}</label>
            <div className="flex">
              <span className="input w-auto! rounded-r-none border-r-0 bg-bg text-muted grid place-items-center">+91</span>
              <input
                id="phone" name="phone" className="input rounded-l-none tabular" inputMode="numeric" autoComplete="tel-national"
                maxLength={11} required defaultValue={profile.phone?.slice(-10) ?? ''}
              />
            </div>
            <p className="hint">{o.phoneHint}</p>
          </div>
          <div>
            <label className="label" htmlFor="business_name">{o.businessName}</label>
            <input id="business_name" name="business_name" className="input" required defaultValue={profile.business_name ?? ''} />
          </div>
          <div>
            <label className="label" htmlFor="gstin">
              {o.gstin} <span className="font-normal text-muted">({t.common.optional})</span>
            </label>
            <input id="gstin" name="gstin" className="input uppercase tabular" maxLength={15} defaultValue={profile.gstin ?? ''} />
            <p className="hint">{o.gstinHint}</p>
          </div>
          <fieldset>
            <legend className="label">{o.role}</legend>
            <div className="grid gap-2">
              {([['seller', o.roleSeller], ['buyer', o.roleBuyer], ['both', o.roleBoth]] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 rounded-lg border border-line px-3 py-3 cursor-pointer has-checked:border-accent has-checked:bg-accent-soft">
                  <input type="radio" name="role" value={value} defaultChecked={value === 'seller'} className="accent-[var(--accent)]" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="area">{t.common.area}</label>
            <input id="area" name="area" className="input" required placeholder={t.common.areaHint} />
          </div>
          <div>
            <label className="label" htmlFor="address">{o.address}</label>
            <textarea id="address" name="address" className="input" required />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}

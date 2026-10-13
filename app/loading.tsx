// Shown the instant a link is clicked, while the next page's data loads.
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-6 py-6 space-y-4 animate-pulse" role="status" aria-label="Loading">
      <div className="h-24 rounded-2xl bg-[#dfe6f3]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#e6ecf6]" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-[#e9eef7]" />
    </div>
  )
}

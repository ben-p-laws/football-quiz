// Text wordmark, set in the Football Golf lobby's display face (Instrument Sans 700 (its heaviest weight)).
// "Top" uses the primary label colour; brand red is reserved for "Bins", the one accent.
export default function Wordmark({ size = 22, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <span
      aria-label="TopBins"
      style={{
        fontFamily: 'var(--font-instrument), system-ui, sans-serif',
        fontSize: size,
        fontWeight: 700,
        letterSpacing: '-0.035em',
        lineHeight: 1,
        color: muted ? 'rgb(255 255 255 / .45)' : 'oklch(97% 0.01 265)',
        whiteSpace: 'nowrap',
      }}
    >
      Top<span style={{ color: muted ? 'rgb(227 35 44 / .6)' : '#E3232C' }}>Bins</span>
    </span>
  )
}

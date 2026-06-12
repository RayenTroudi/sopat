'use client'

export function PrintButton() {
  function handlePrint() {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) { window.print(); return }

    const doc = win.document

    const meta = doc.createElement('meta')
    meta.setAttribute('charset', 'utf-8')
    doc.head.appendChild(meta)

    const titleEl = doc.createElement('title')
    titleEl.textContent = 'Impact RSE — SOPAT'
    doc.head.appendChild(titleEl)

    const style = doc.createElement('style')
    style.textContent = `
      @page { size: A4; margin: 1.5cm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111827; background: white; margin: 0; padding: 24px; }
      .print-logo-bar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
      .print-logo-bar img { height: 44px; width: auto; }
      .print-logo-bar p { color: #6b7280; font-size: 11px; margin: 4px 0 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th { text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; padding: 6px 12px; border-bottom: 1px solid #e5e7eb; }
      td { font-size: 12px; padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
      h1,h2,h3 { color: #111827; }
    `
    doc.head.appendChild(style)

    // Logo bar
    const logoBar = doc.createElement('div')
    logoBar.className = 'print-logo-bar'

    const titleDiv = doc.createElement('div')
    const strong = doc.createElement('strong')
    strong.style.cssText = 'font-size:16px;color:#111827;'
    strong.textContent = 'Tableau de bord Impact RSE'
    const dateP = doc.createElement('p')
    dateP.textContent = `Généré le ${new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })}`
    titleDiv.appendChild(strong)
    titleDiv.appendChild(dateP)

    const logo = doc.createElement('img')
    logo.src = `${window.location.origin}/logo-768x519.svg`
    logo.alt = 'SOPAT'
    logo.style.cssText = 'height:44px;width:auto;'

    logoBar.appendChild(titleDiv)
    logoBar.appendChild(logo)
    doc.body.appendChild(logoBar)

    // Clone the printable content (KPI cards + charts + table)
    const printable = document.getElementById('rse-impact-printable')
    if (printable) {
      const clone = printable.cloneNode(true) as HTMLElement
      // Remove screen-only elements
      clone.querySelectorAll('[data-print-hide]').forEach(el => el.remove())
      doc.body.appendChild(clone)
    }

    win.focus()
    // Small delay to let the SVG logo load before printing
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  return (
    <button
      onClick={handlePrint}
      className="px-4 py-2 rounded-lg text-sm font-medium border print:hidden"
      style={{ borderColor: 'var(--admin-border)', color: 'var(--admin-text)' }}
    >
      🖨 Exporter en PDF
    </button>
  )
}

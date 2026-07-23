import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const repoFile = (relativePath: string) => join(process.cwd(), relativePath)

describe('wingsside backfill mixed-language cleanup', () => {
  it('keeps repaired WingsSide locale backfill copy free of known mixed-language literals', async () => {
    const localeBackfill = await readFile(repoFile('scripts/lib/wingssideLocaleBackfill.ts'), 'utf8')
    const siteSettingsBackfill = await readFile(
      repoFile('scripts/lib/wingssideSiteSettingsBackfill.ts'),
      'utf8',
    )

    const forbiddenLocaleLiterals = [
      'Las páginas inbound package deberían ilustrar qué puede construirse y luego mover al usuario hacia inquiry y personalización.',
      'As páginas inbound package devem ilustrar o que se pode construir e depois mover o utilizador para inquiry e personalização.',
      'Le pagine inbound package dovrebbero illustrare cosa si può costruire e poi spostare l’utente verso inquiry e personalizzazione.',
      'La planificación inbound todavía necesita alcance humano antes de cotización y operación.',
      'O planeamento inbound ainda precisa de avaliação humana antes de cotação e operação.',
      'Hãy dùng planner để ghép điểm đến này với các vùng khác, travel styles và nhịp phù hợp với nhóm của bạn.',
      'Trang destination nên trộn tổng quan, mùa vụ, cụm trải nghiệm chính, route liên quan và một đường dẫn rõ sang inquiry.',
      'Khám phá điểm đến nên dẫn sang inquiry khi khách đã thấy đủ tín hiệu tin cậy.',
      'como página de planificación inbound',
      'como página de planeamento inbound',
      'come pagina di pianificazione inbound',
      'Trang điểm đến ${title} cho planning inbound Việt Nam của WingsSide.',
    ]

    const forbiddenSiteSettingsLiterals = [
      'WingsSide se centra en planificación inbound, destinos, estilos de viaje y solicitudes a medida.',
      'Planificación inbound de Vietnam con destinos, estilos y asesoría.',
      'WingsSide si concentra su pianificazione inbound, destinazioni, stili di viaggio e richieste su misura.',
      'Pianificazione inbound Vietnam con destinazioni, stili e consulenza.',
      'A WingsSide foca-se em planeamento inbound, destinos, estilos de viagem e pedidos à medida.',
      'Planeamento inbound do Vietname com destinos, estilos e consultoria.',
      'WingsSide tập trung inbound planning, destination storytelling, travel styles và trip inquiry thay vì retail tour grid.',
      'Lập kế hoạch inbound Vietnam với điểm đến, phong cách du lịch và luồng tư vấn.',
    ]

    for (const literal of forbiddenLocaleLiterals) {
      expect(localeBackfill).not.toContain(literal)
    }

    for (const literal of forbiddenSiteSettingsLiterals) {
      expect(siteSettingsBackfill).not.toContain(literal)
    }
  })
})

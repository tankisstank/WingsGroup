import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const repoFile = (relativePath: string) =>
  join(process.cwd(), relativePath)

describe('multisite seed mixed-language cleanup', () => {
  it('keeps the repaired Vietnamese WingsGroup and WingsCare seed copy free of known mixed-language literals', async () => {
    const source = await readFile(repoFile('scripts/seed-subsites.ts'), 'utf8')

    const forbiddenLiterals = [
      'WingsCare là site trust-first cho bảo hiểm du lịch',
      'Trust-first IA',
      'Bảo hiểm inbound / khách quốc tế',
      'Điểm vào inbound Vietnam với destination storytelling, travel style, sample itinerary và inquiry flow cho khách quốc tế.',
      'WingsGroup không bán một loại hành trình duy nhất. Hệ này được tổ chức để phục vụ retail outbound, inbound Vietnam, airport service, premium proposal và after-sales support dưới các bề mặt khác nhau.',
      'Lớp umbrella của hệ sinh thái WingsGroup, kết nối outbound retail, inbound Vietnam, airport support, private / MICE và care support.',
      'Trang umbrella của hệ sinh thái WingsGroup, kết nối outbound retail, inbound Vietnam, airport support, private / MICE và care support.',
      'Khách inbound cần destination narrative, sample itinerary, travel style và inquiry flow mang tính tư vấn.',
      'Có thể liên kết với tour outbound, inbound, private hoặc fast track.',
      'Từ tour outbound đại trà và hành trình cho khách quốc tế tại Việt Nam đến dịch vụ sân bay, private/MICE và chăm sóc sau bán, WingsGroup giúp khách đi đúng bề mặt, đúng nội dung và đúng đội phụ trách.',
      'Hành trình vào Việt Nam cần điểm đến, phong cách du lịch, hành trình mẫu và luồng tư vấn rõ ràng.',
      'WingsGroup không bán một loại hành trình duy nhất. Hệ này được tổ chức để phục vụ tour outbound đại trà, hành trình cho khách quốc tế tại Việt Nam, dịch vụ sân bay, đề xuất cao cấp và hỗ trợ sau bán dưới các bề mặt khác nhau.',
      'Tổng quan tour outbound đại trà, hành trình cho khách quốc tế tại Việt Nam, fast track, private / MICE và chăm sóc sau bán trong hệ sinh thái WingsGroup.',
      'Inbound Vietnam, destination storytelling và sample itinerary.',
      'WingsSide không nên nói như một bảng giá retail. Site này cần destination storytelling, sample itinerary và inquiry flow dành cho khách quốc tế.',
      'Khách quốc tế thường không mua Việt Nam như mua một retail departure page. Họ cần hiểu nhịp hành trình, tổ hợp điểm đến, travel style và mức độ cá nhân hóa.',
      'WingsSide có destination hub, travel styles và sample itineraries. Đó là cấu trúc đúng cho một hành trình inbound tailor-made hoặc inquiry-led.',
      'Lớp umbrella của hệ sinh thái WingsGroup, kết nối tour outbound đại trà, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, private / MICE và chăm sóc sau bán.',
      'Trang umbrella của hệ sinh thái WingsGroup, kết nối tour outbound đại trà, hành trình cho khách quốc tế tại Việt Nam, hỗ trợ sân bay, private / MICE và chăm sóc sau bán.',
      'Trust-first information architecture',
      'Giải thích cách doanh nghiệp phục vụ outbound, inbound, airport support, premium và care.',
      'Inbound Vietnam, destinations, and sample itineraries.',
    ]

    for (const literal of forbiddenLiterals) {
      expect(source).not.toContain(literal)
    }
  })
})

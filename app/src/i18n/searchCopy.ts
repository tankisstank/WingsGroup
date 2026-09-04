import type { PublicLocaleCode } from './publicCopy'
import { isPublicLocale, type SupportedLocaleCode } from '../utilities/locales'

export type SearchPageCopy = {
  cta: string
  emptyHeading: string
  emptyText: string
  heading: string
  kicker: string
  paragraph: string
  searchAria: string
  suggestions: [string, string, string, string]
}

export const searchPageCopyByLocale: Record<PublicLocaleCode, SearchPageCopy> = {
  en: {
    cta: 'Request consultation',
    emptyHeading: 'No matching result found',
    emptyText:
      'The content may not be published yet, or the request may need a consultation based on actual inventory and schedule. Send an inquiry so the WingsGroup team can review and respond with a suitable direction.',
    heading: 'Search tours, destinations, and campaigns quickly',
    kicker: 'Search WingsGroup',
    paragraph:
      'Enter a market, travel season, city, or travel type. If the right content is not available yet, send a request so the team can review the relevant schedule and package options.',
    searchAria: 'Search suggestions',
    suggestions: ['Korea tours', 'Jeju / Seoul', 'Vietnam journeys', 'Private consultation'],
  },
  es: {
    cta: 'Solicitar asesoría',
    emptyHeading: 'No encontramos un resultado adecuado',
    emptyText:
      'Es posible que el contenido aún no esté publicado o que la solicitud requiera asesoría según salidas y disponibilidad reales. Envíe una consulta para que el equipo revise y proponga la mejor opción.',
    heading: 'Busca con rapidez tours, destinos y campañas',
    kicker: 'Buscar en WingSide',
    paragraph:
      'Introduce un mercado, temporada, ciudad o tipo de viaje. Si aún no ves el contenido adecuado, envía una solicitud para que el equipo revise las salidas y opciones más relevantes.',
    searchAria: 'Sugerencias de búsqueda',
    suggestions: ['Tours por Corea', 'Jeju / Seúl', 'Viajes por Vietnam', 'Asesoría privada'],
  },
  it: {
    cta: 'Richiedi una consulenza',
    emptyHeading: 'Nessun risultato adatto trovato',
    emptyText:
      'Il contenuto potrebbe non essere ancora pubblicato oppure la richiesta potrebbe richiedere una consulenza basata su disponibilità e calendario reali. Invia una richiesta e la squadra ti proporrà la direzione più adatta.',
    heading: 'Cerca rapidamente tour, destinazioni e campagne',
    kicker: 'Cerca in WingSide',
    paragraph:
      'Inserisci mercato, stagione, città o tipo di viaggio. Se il contenuto giusto non è ancora disponibile, invia una richiesta così la squadra potrà verificare partenze e proposte pertinenti.',
    searchAria: 'Suggerimenti di ricerca',
    suggestions: ['Tour della Corea', 'Jeju / Seoul', 'Viaggi in Vietnam', 'Consulenza privata'],
  },
  pt: {
    cta: 'Pedir aconselhamento',
    emptyHeading: 'Não encontrámos um resultado adequado',
    emptyText:
      'O conteúdo pode ainda não estar publicado ou o pedido pode precisar de aconselhamento com base em disponibilidade e datas reais. Envie um pedido para que a equipa possa rever e sugerir a melhor direção.',
    heading: 'Pesquise rapidamente tours, destinos e campanhas',
    kicker: 'Pesquisar na WingSide',
    paragraph:
      'Introduza mercado, época, cidade ou tipo de viagem. Se o conteúdo certo ainda não estiver disponível, envie um pedido para que a equipa reveja saídas e opções relevantes.',
    searchAria: 'Sugestões de pesquisa',
    suggestions: [
      'Tours na Coreia',
      'Jeju / Seul',
      'Viagens no Vietname',
      'Aconselhamento privado',
    ],
  },
  vi: {
    cta: 'Gửi yêu cầu tư vấn',
    emptyHeading: 'Chưa tìm thấy kết quả phù hợp',
    emptyText:
      'Có thể nội dung chưa được xuất bản hoặc yêu cầu này cần được tư vấn dựa trên lịch khởi hành và khả năng phục vụ thực tế. Hãy gửi yêu cầu để đội ngũ kiểm tra và phản hồi hướng phù hợp.',
    heading: 'Tìm nhanh tour, điểm đến và chiến dịch',
    kicker: 'Tìm kiếm WingSide',
    paragraph:
      'Nhập thị trường, mùa đi, thành phố hoặc loại trải nghiệm. Nếu chưa thấy nội dung phù hợp, hãy gửi yêu cầu để đội ngũ kiểm tra lịch và các lựa chọn liên quan.',
    searchAria: 'Gợi ý tìm kiếm',
    suggestions: ['Tour Hàn Quốc', 'Jeju / Seoul', 'Hành trình Việt Nam', 'Tư vấn riêng'],
  },
}

export const searchInputCopy: Record<
  PublicLocaleCode,
  { label: string; placeholder: string; submit: string }
> = {
  en: {
    label: 'Search',
    placeholder: 'Search tours, destinations, campaigns...',
    submit: 'Submit search',
  },
  es: {
    label: 'Buscar',
    placeholder: 'Buscar tours, destinos y campañas...',
    submit: 'Enviar búsqueda',
  },
  it: {
    label: 'Cerca',
    placeholder: 'Cerca tour, destinazioni e campagne...',
    submit: 'Invia ricerca',
  },
  pt: {
    label: 'Pesquisar',
    placeholder: 'Pesquisar tours, destinos e campanhas...',
    submit: 'Enviar pesquisa',
  },
  vi: {
    label: 'Tìm kiếm',
    placeholder: 'Tìm tour, điểm đến, chiến dịch...',
    submit: 'Gửi tìm kiếm',
  },
}

export const searchMetadataCopy: Record<PublicLocaleCode, { description: string; title: string }> =
  {
    en: {
      description:
        'Search tours, destinations, seasonal campaigns, departure schedules, and travel articles across the public site.',
      title: 'Search',
    },
    es: {
      description:
        'Busca tours, destinos, campañas estacionales, salidas y artículos de viaje en el sitio público.',
      title: 'Buscar',
    },
    it: {
      description:
        'Cerca tour, destinazioni, campagne stagionali, partenze e articoli di viaggio nel sito pubblico.',
      title: 'Cerca',
    },
    pt: {
      description:
        'Pesquise tours, destinos, campanhas sazonais, partidas e artigos de viagem no site público.',
      title: 'Pesquisar',
    },
    vi: {
      description:
        'Tìm kiếm tour, điểm đến, chiến dịch theo mùa, lịch khởi hành và bài viết du lịch trên website công khai.',
      title: 'Tìm kiếm',
    },
  }

export const getSearchCopy = <T>(
  copy: Record<PublicLocaleCode, T>,
  locale: SupportedLocaleCode,
): T => (isPublicLocale(locale) ? copy[locale as PublicLocaleCode] : copy.en)

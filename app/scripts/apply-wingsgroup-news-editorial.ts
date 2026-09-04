import 'dotenv/config'

import { createLocalReq, getPayload, type Payload } from 'payload'

type Section = { heading: string; paragraphs: string[] }
type LocalizedArticle = { title: string; description: string; sections: Section[] }

type Article = {
  slug: string
  vi: LocalizedArticle
  en: LocalizedArticle
}

const applyConfirmation = 'CONFIRM_WINGSGROUP_NEWS_EDITORIAL_WRITE'
const editorialAuthorEmail = 'content-specialist@wingsgroup.vn'
const editorialAuthorName = 'Chuyên viên nội dung'

const seoTitles: Record<string, Record<'vi' | 'en', string>> = {
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': {
    vi: 'Kiểm tra dịch vụ du lịch | WingsGroup',
    en: 'Verify a travel provider | WingsGroup',
  },
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': {
    vi: 'Checklist đặt dịch vụ | WingsGroup',
    en: 'Travel booking checklist | WingsGroup',
  },
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': {
    vi: 'Chọn private journey | WingsGroup',
    en: 'Private journey guide | WingsGroup',
  },
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': {
    vi: 'Du lịch Việt Nam | WingsGroup',
    en: 'Vietnam tailor-made travel | WingsGroup',
  },
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': {
    vi: 'Tour Hàn, Nhật, Trung | WingsGroup',
    en: 'Korea, Japan or China | WingsGroup',
  },
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': {
    vi: 'Bảo hiểm du lịch | WingsGroup',
    en: 'Travel insurance | WingsGroup',
  },
  'fast-track-airport-services-khi-nao-nen-su-dung': {
    vi: 'Fast-track sân bay | WingsGroup',
    en: 'Airport fast-track | WingsGroup',
  },
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': {
    vi: 'Tour đoàn và MICE | WingsGroup',
    en: 'Group travel and MICE | WingsGroup',
  },
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': {
    vi: 'Bắt đầu cùng WingsGroup | WingsGroup',
    en: 'Start with WingsGroup | WingsGroup',
  },
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': {
    vi: '5 site WingsGroup | WingsGroup',
    en: 'Five WingsGroup sites | WingsGroup',
  },
  'he-sinh-thai-wingsgroup-la-gi': {
    vi: 'Hệ sinh thái WingsGroup | WingsGroup',
    en: 'WingsGroup ecosystem | WingsGroup',
  },
}

const seoDescription = (description: string, locale: 'vi' | 'en') =>
  `${description} ${locale === 'vi' ? 'Đọc các câu hỏi nên chuẩn bị để lựa chọn và bắt đầu hành trình rõ ràng hơn.' : 'Read the practical questions that help you choose clearly and begin your journey with confidence.'}`.slice(
    0,
    155,
  )

const articles: Article[] = [
  {
    slug: 'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
    vi: {
      title: 'Trước khi đặt chuyến đi, hãy kiểm tra những gì?',
      description:
        'Một vài bước bình tĩnh giúp bạn chọn đúng đơn vị đồng hành và đọc rõ cam kết dịch vụ trước khi thanh toán.',
      sections: [
        {
          heading: 'Đừng vội quyết định chỉ vì một tấm ảnh đẹp',
          paragraphs: [
            'Một hành trình hấp dẫn thường bắt đầu bằng cảm xúc: một khung cảnh đẹp, giá dễ chịu hoặc lời giới thiệu từ người quen. Nhưng trước khi chuyển khoản, hãy dành vài phút để nhìn vào phần ít hào nhoáng hơn: tên pháp nhân, địa chỉ liên hệ, kênh hỗ trợ và phạm vi dịch vụ mà đơn vị đó thực sự cung cấp.',
            'Đây không phải là sự hoài nghi quá mức. Đó là cách để bạn biến một quyết định cảm tính thành một lựa chọn có thông tin.',
          ],
        },
        {
          heading: 'Hỏi để có một đề xuất rõ ràng',
          paragraphs: [
            'Một đề xuất tốt cần cho bạn biết điều gì đã bao gồm, điều gì chưa; lịch trình dự kiến, tiêu chuẩn dịch vụ, điều kiện thay đổi và đầu mối chịu trách nhiệm khi có phát sinh. Hãy ưu tiên câu trả lời được xác nhận bằng văn bản thay vì những lời hứa chỉ xuất hiện trong cuộc trò chuyện.',
            'Nếu có chi tiết nào chưa rõ, hãy hỏi ngay từ đầu. Câu hỏi đúng thường giúp cả hai bên làm việc dễ dàng hơn.',
          ],
        },
        {
          heading: 'Thanh toán an tâm bắt đầu từ đúng thông tin',
          paragraphs: [
            'Xác nhận đơn vị nhận tiền, mốc thanh toán, chứng từ bạn sẽ nhận và cách xử lý khi kế hoạch phải thay đổi. Chỉ gửi hộ chiếu hoặc dữ liệu nhạy cảm sau khi đã xác nhận đúng kênh tiếp nhận và mục đích sử dụng.',
            'Một người đồng hành chuyên nghiệp sẽ không ngại làm rõ những điểm này.',
          ],
        },
        {
          heading: 'Giữ một đầu mối liên hệ xuyên suốt',
          paragraphs: [
            'Trước ngày khởi hành, hãy lưu lại tên, số điện thoại và kênh liên lạc của người phụ trách. Khi có thay đổi về giờ bay, thời tiết hoặc nhu cầu cá nhân, một đầu mối rõ ràng quan trọng hơn rất nhiều so với một danh sách hotline dài.',
            'Nếu cần tư vấn thêm, đội ngũ WingsGroup có thể giúp bạn xác định đúng dịch vụ và kênh hỗ trợ phù hợp.',
          ],
        },
      ],
    },
    en: {
      title: 'What to check before you commit to a trip',
      description:
        'A few calm checks can help you choose the right travel partner and understand the service before you pay.',
      sections: [
        {
          heading: 'Look beyond the beautiful first impression',
          paragraphs: [
            'A striking image, a tempting price, or a friend’s recommendation can make a journey feel decided before the practical questions begin. Before paying, take a moment to check the business identity, contact channels, service scope, and the team that will actually support you.',
            'That is not distrust. It is simply a more informed way to travel.',
          ],
        },
        {
          heading: 'Ask for a proposal you can read clearly',
          paragraphs: [
            'A thoughtful proposal explains what is included, what is not, the intended schedule, service standards, change terms, and the person accountable if something shifts. Prefer details confirmed in writing over promises made only in conversation.',
            'A useful question asked early usually makes the journey smoother for everyone.',
          ],
        },
        {
          heading: 'Make payment with the right information in hand',
          paragraphs: [
            'Confirm the receiving entity, payment milestones, documents you will receive, and the process if plans change. Share passport details or other sensitive information only through a confirmed channel and for a clear purpose.',
            'A professional travel partner will be comfortable explaining each of these points.',
          ],
        },
        {
          heading: 'Keep one reliable point of contact',
          paragraphs: [
            'Before departure, save the name, phone number, and preferred channel of the person looking after your trip. When a flight, weather pattern, or personal plan changes, one clear contact is more valuable than a long list of numbers.',
            'WingsGroup can help you find the right service and support path when you need a second view.',
          ],
        },
      ],
    },
  },
  {
    slug: 'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
    vi: {
      title: 'Checklist nhỏ trước khi bạn đặt một dịch vụ du lịch',
      description:
        'Không cần biến việc chuẩn bị thành áp lực: chỉ cần kiểm tra vài điều quan trọng trước khi nói lời đồng ý.',
      sections: [
        {
          heading: 'Bắt đầu từ nhu cầu thật của bạn',
          paragraphs: [
            'Bạn cần một chuyến đi trọn gói, một hành trình riêng, hỗ trợ sân bay hay một người tư vấn để ghép các mảnh lại với nhau? Câu trả lời sẽ quyết định bạn nên tìm ở đâu và cần hỏi gì.',
            'Khi nhu cầu đã rõ, bạn ít bị cuốn theo những thông tin không liên quan.',
          ],
        },
        {
          heading: 'Đọc phần bao gồm và không bao gồm',
          paragraphs: [
            'Đừng chỉ nhìn vào con số cuối cùng. Hãy xem kỹ dịch vụ nào đã nằm trong báo giá, khoản nào phụ thuộc vào thời điểm, và đâu là phần bạn có thể điều chỉnh.',
            'Một hành trình phù hợp không nhất thiết là hành trình nhiều hạng mục nhất; đó là hành trình có những hạng mục đúng với mình.',
          ],
        },
        {
          heading: 'Xem điều kiện thay đổi như một phần của trải nghiệm',
          paragraphs: [
            'Kế hoạch có thể thay đổi vì lịch làm việc, sức khỏe hoặc thời tiết. Biết trước thời hạn, chi phí và quy trình xử lý sẽ giúp bạn bình tĩnh hơn nếu điều đó xảy ra.',
            'Hãy lưu lại bản xác nhận cuối cùng sau khi các chi tiết đã được chốt.',
          ],
        },
        {
          heading: 'Chọn đúng nơi để bắt đầu',
          paragraphs: [
            'Nếu bạn đã biết loại dịch vụ mình cần, hãy đi thẳng tới đội ngũ chuyên môn phù hợp. Nếu chưa rõ, một cuộc trao đổi ngắn với WingsGroup có thể giúp bạn định hướng trước khi đi sâu vào lựa chọn.',
          ],
        },
      ],
    },
    en: {
      title: 'A small checklist before you book travel services',
      description:
        'Preparation does not need to feel heavy. A few practical checks can make the decision much clearer.',
      sections: [
        {
          heading: 'Start with what you actually need',
          paragraphs: [
            'Are you looking for a packaged trip, a private journey, airport support, or help connecting several moving parts? The answer shapes where you should look and what you should ask.',
            'Once the need is clear, it is easier to ignore noise.',
          ],
        },
        {
          heading: 'Read what is included — and what is not',
          paragraphs: [
            'Look beyond the final number. Check which services are included, which depend on timing, and which parts can be adjusted.',
            'The best trip is not necessarily the one with the longest list; it is the one with the right list for you.',
          ],
        },
        {
          heading: 'Treat change terms as part of the experience',
          paragraphs: [
            'Plans can change because of work, health, or weather. Knowing the timing, cost, and process in advance makes a difficult moment easier to manage.',
            'Keep the final written confirmation once the details are agreed.',
          ],
        },
        {
          heading: 'Begin in the right place',
          paragraphs: [
            'If you already know the service you need, speak with the relevant specialist team. If not, a short conversation with WingsGroup can help you find the right direction before you go deeper.',
          ],
        },
      ],
    },
  },
  {
    slug: 'xu-huong-du-lich-cao-cap-va-private-journey-2026',
    vi: {
      title: 'Một hành trình riêng đáng nhớ không chỉ nằm ở nơi bạn ở',
      description:
        'Những điều khiến một chuyến đi cao cấp trở nên có ý nghĩa thường tinh tế hơn một danh sách tiện nghi.',
      sections: [
        {
          heading: 'Thời gian là một loại xa xỉ',
          paragraphs: [
            'Ngày càng nhiều du khách muốn một nhịp đi vừa đủ: không phải chạy theo thật nhiều điểm đến, cũng không bị bỏ lại giữa những khoảng trống thiếu chủ đích. Một lịch trình tốt dành chỗ cho sự nghỉ ngơi, những cuộc gặp gỡ bất ngờ và cả quyền đổi ý.',
            'Đó là lý do một hành trình riêng thường bắt đầu bằng cuộc trò chuyện, không phải một bảng giá có sẵn.',
          ],
        },
        {
          heading: 'Sự riêng tư cần được thiết kế cẩn thận',
          paragraphs: [
            'Riêng tư không có nghĩa là tách mình khỏi mọi trải nghiệm. Đó có thể là một bữa tối đúng nhịp, một xe đưa đón đúng giờ, hay một người điều phối hiểu khi nào nên lùi lại.',
            'Những chi tiết nhỏ ấy tạo ra cảm giác được chăm sóc mà không bị làm phiền.',
          ],
        },
        {
          heading: 'Cá nhân hóa cần đi cùng sự thành thật',
          paragraphs: [
            'Không phải đề xuất nào cũng nên hứa mọi thứ. Một tư vấn tốt sẽ nói rõ điều gì khả thi theo mùa, theo thời gian và theo ngân sách; sau đó cùng bạn chọn phương án đẹp nhất trong những giới hạn thật.',
            'Sự thẳng thắn đó thường là khởi đầu của một hành trình đáng tin.',
          ],
        },
        {
          heading: 'Bắt đầu bằng một brief chân thành',
          paragraphs: [
            'Hãy chia sẻ điều bạn muốn cảm nhận, nhịp sinh hoạt, người đồng hành và những điều bạn muốn tránh. Đội ngũ chuyên trách có thể biến một ý tưởng còn mơ hồ thành đề xuất có cấu trúc và dễ quyết định.',
          ],
        },
      ],
    },
    en: {
      title: 'A memorable private journey is about more than where you stay',
      description:
        'The details that make premium travel meaningful are often quieter than a list of amenities.',
      sections: [
        {
          heading: 'Time is its own kind of luxury',
          paragraphs: [
            'Many travellers now want a pace with room to breathe: not a rush through landmarks, and not empty time without purpose. A well-shaped itinerary leaves space for rest, small surprises, and the freedom to change your mind.',
            'That is why a private journey begins with a conversation rather than a fixed price list.',
          ],
        },
        {
          heading: 'Privacy has to be designed with care',
          paragraphs: [
            'Privacy does not mean stepping away from every experience. It may be a dinner at the right pace, a transfer that arrives quietly on time, or a coordinator who knows when to step back.',
            'Those details create care without intrusion.',
          ],
        },
        {
          heading: 'Personalisation works best with honesty',
          paragraphs: [
            'A good proposal does not promise everything. It explains what is possible for the season, time, and budget, then helps you choose the most satisfying option within real limits.',
            'That honesty is often where trust begins.',
          ],
        },
        {
          heading: 'Start with an honest brief',
          paragraphs: [
            'Share what you hope to feel, how you like to move through a day, who you are travelling with, and what you would rather avoid. A specialist team can turn an early idea into a clear, considered proposal.',
          ],
        },
      ],
    },
  },
  {
    slug: 'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made',
    vi: {
      title: 'Việt Nam đẹp nhất khi hành trình được đi theo nhịp của riêng bạn',
      description:
        'Từ nhịp phố đến miền biển, một chuyến đi thiết kế riêng giúp các trải nghiệm kết nối tự nhiên hơn.',
      sections: [
        {
          heading: 'Không phải ai cũng muốn đi theo cùng một tuyến',
          paragraphs: [
            'Có người muốn bắt đầu ngày bằng cà phê phố cổ, có người chỉ muốn ở lâu hơn bên một bờ biển yên tĩnh. Việt Nam đủ nhiều lớp để mỗi lựa chọn đều có lý do tồn tại.',
            'Vì vậy, một hành trình thiết kế riêng không bắt bạn phải chọn giữa “đủ” và “đúng”.',
          ],
        },
        {
          heading: 'Đi chậm để nhìn sâu hơn',
          paragraphs: [
            'Thay vì biến mỗi ngày thành cuộc đua, hãy chọn vài điểm dừng có thể ở lại lâu hơn. Khi không bị kéo đi bởi lịch trình quá dày, bạn có thời gian nhận ra mùi hương của một khu chợ, nhịp nước ven sông hay câu chuyện của một người bản địa.',
            'Đó là những điều thường ở lại lâu sau khi chuyến đi kết thúc.',
          ],
        },
        {
          heading: 'Kết nối các vùng bằng một câu chuyện',
          paragraphs: [
            'Một tuyến đường có thể đi từ thành phố vào thiên nhiên, từ di sản đến ẩm thực, nhưng vẫn cần một mạch cảm xúc. Người thiết kế hành trình giúp các chặng ấy không trở thành những mảnh ghép rời rạc.',
            'Thời tiết, mùa vụ và quãng đường thực tế đều cần được tính trước.',
          ],
        },
        {
          heading: 'Cho phép hành trình phản ánh con người bạn',
          paragraphs: [
            'Hãy nói về những điều bạn thích và những điều bạn không muốn lặp lại. Từ đó, đội ngũ tư vấn có thể gợi ý một hành trình Việt Nam gần gũi hơn với cách bạn muốn sống trong những ngày đi xa.',
          ],
        },
      ],
    },
    en: {
      title: 'Vietnam is at its best when the journey follows your own rhythm',
      description:
        'From city texture to coastal calm, a tailor-made trip lets each experience connect more naturally.',
      sections: [
        {
          heading: 'Not everyone wants the same route',
          paragraphs: [
            'One traveller may want to begin with old-quarter coffee; another may prefer to linger by a quiet shore. Vietnam has enough texture for both choices to make sense.',
            'A tailor-made journey does not force you to choose between seeing enough and seeing what feels right.',
          ],
        },
        {
          heading: 'Slow down to notice more',
          paragraphs: [
            'Rather than turning every day into a race, choose a few places where you can stay longer. A lighter pace makes room for market scents, river rhythms, and conversations that are easy to miss on a packed schedule.',
            'Those are often the memories that remain.',
          ],
        },
        {
          heading: 'Connect regions through one story',
          paragraphs: [
            'A route can move from city to nature, heritage to food, yet still need an emotional thread. Good journey design keeps the stages from feeling like separate fragments.',
            'Weather, seasonality, and realistic travel times all deserve attention.',
          ],
        },
        {
          heading: 'Let the journey reflect who you are',
          paragraphs: [
            'Share what you enjoy and what you would rather not repeat. A thoughtful specialist can shape a Vietnam journey that feels closer to the way you want to live while you are away.',
          ],
        },
      ],
    },
  },
  {
    slug: 'cach-chon-dung-line-outbound-cho-han-nhat-trung',
    vi: {
      title: 'Chọn chuyến đi Hàn, Nhật hay Trung: hãy bắt đầu từ điều bạn muốn trải nghiệm',
      description: 'Mỗi điểm đến có một nhịp riêng; chọn đúng không chỉ là chọn đúng lịch bay.',
      sections: [
        {
          heading: 'Đừng bắt đầu bằng câu hỏi “đâu rẻ hơn?”',
          paragraphs: [
            'Giá là một phần quan trọng, nhưng hiếm khi là toàn bộ câu trả lời. Hãy nghĩ về số ngày bạn có, nhịp đi bạn thích, người đồng hành và điều khiến bạn hào hứng nhất: thiên nhiên, ẩm thực, mua sắm hay những lát cắt văn hóa.',
            'Khi ưu tiên đã rõ, việc so sánh chương trình trở nên nhẹ nhàng hơn.',
          ],
        },
        {
          heading: 'Mỗi mùa thay đổi cách một điểm đến kể chuyện',
          paragraphs: [
            'Một thành phố quen thuộc có thể rất khác vào mùa hoa, mùa lá hay mùa lễ hội. Thay vì cố chen mọi trải nghiệm vào một chuyến đi, hãy chọn thời điểm phù hợp nhất với mong muốn chính của bạn.',
            'Đội ngũ tư vấn sẽ giúp bạn đọc lịch khởi hành và điều kiện thực tế theo từng thời điểm.',
          ],
        },
        {
          heading: 'Đọc chương trình theo nhịp của mình',
          paragraphs: [
            'Hãy xem số lần đổi khách sạn, quãng đường di chuyển, thời gian tự do và những bữa ăn đã sắp xếp. Nếu đi cùng trẻ nhỏ hoặc người lớn tuổi, một lịch trình ít chuyển chặng hơn có thể đáng giá hơn rất nhiều.',
            'Một chương trình tốt là chương trình bạn có thể hình dung mình đang tận hưởng.',
          ],
        },
        {
          heading: 'Để lại một khoảng cho những câu hỏi riêng',
          paragraphs: [
            'Thị thực, hành lý, chế độ ăn hay ngày nghỉ có thể ảnh hưởng đến lựa chọn cuối cùng. Hãy đưa những câu hỏi đó vào cuộc tư vấn để đề xuất phù hợp với bạn, thay vì phù hợp với một nhóm khách chung chung.',
          ],
        },
      ],
    },
    en: {
      title: 'Choosing Korea, Japan, or China starts with how you want to travel',
      description:
        'Each destination has its own rhythm; the right choice is more than the right flight date.',
      sections: [
        {
          heading: 'Start with more than price',
          paragraphs: [
            'Price matters, but it is rarely the whole answer. Think about the days you have, the pace you enjoy, your companions, and what excites you most: nature, food, shopping, or cultural texture.',
            'Once priorities are clear, comparing programmes feels much simpler.',
          ],
        },
        {
          heading: 'Every season tells a destination differently',
          paragraphs: [
            'A familiar city can feel entirely different during blossom season, autumn colour, or a festival period. Rather than trying to fit everything into one trip, choose the moment that best suits your main wish.',
            'A travel adviser can help you read departure timing and practical conditions.',
          ],
        },
        {
          heading: 'Read an itinerary at your own pace',
          paragraphs: [
            'Notice hotel changes, transfer lengths, free time, and meal arrangements. For families or older travellers, fewer transitions can be worth far more than an extra stop.',
            'A good programme is one you can picture yourself enjoying.',
          ],
        },
        {
          heading: 'Leave room for personal questions',
          paragraphs: [
            'Visa needs, luggage, dietary preferences, and holiday dates can all shape the final choice. Bring them into the conversation so the recommendation fits you rather than a generic group.',
          ],
        },
      ],
    },
  },
  {
    slug: 'travel-insurance-va-care-support-can-hieu-dung-dieu-gi',
    vi: {
      title: 'Bảo hiểm và hỗ trợ sau bán: điều gì giúp bạn yên tâm hơn khi đi xa?',
      description:
        'Hiểu đúng quyền lợi, điều kiện và kênh hỗ trợ là một phần quan trọng của sự chuẩn bị.',
      sections: [
        {
          heading: 'Bảo hiểm không phải một dòng chữ ở cuối chương trình',
          paragraphs: [
            'Khi xem quyền lợi bảo hiểm, hãy dành thời gian đọc phạm vi, điều kiện áp dụng, phần loại trừ và cách liên hệ khi cần hỗ trợ. Mỗi sản phẩm có giới hạn riêng; hiểu trước giúp bạn không đặt kỳ vọng sai.',
            'Nếu có điều chưa rõ, hãy yêu cầu giải thích bằng ngôn ngữ dễ hiểu trước khi khởi hành.',
          ],
        },
        {
          heading: 'Lưu thông tin trước khi bạn cần đến nó',
          paragraphs: [
            'Hãy lưu hợp đồng, số hỗ trợ và các giấy tờ liên quan ở một nơi dễ truy cập. Khi phát sinh sự cố, việc có thông tin đúng ngay từ đầu sẽ giúp quá trình trao đổi gọn gàng hơn.',
            'Đừng chờ đến lúc đang ở sân bay mới bắt đầu tìm số liên hệ.',
          ],
        },
        {
          heading: 'Hỗ trợ tốt là hỗ trợ biết lắng nghe',
          paragraphs: [
            'Không phải mọi tình huống đều có một đáp án có sẵn. Một đội ngũ care tốt sẽ giúp bạn hiểu lựa chọn tiếp theo, hồ sơ cần chuẩn bị và đơn vị nào đang phụ trách phần việc đó.',
            'Sự rõ ràng trong lúc cần hỗ trợ quan trọng không kém sự hào hứng khi lên kế hoạch.',
          ],
        },
        {
          heading: 'Chuẩn bị để an tâm, không phải để lo lắng',
          paragraphs: [
            'Mục tiêu của việc đọc kỹ không phải là dự đoán điều xấu. Đó là để bạn có thể đi xa với cảm giác chủ động hơn.',
          ],
        },
      ],
    },
    en: {
      title: 'Travel insurance and care support: what helps you feel prepared?',
      description:
        'Understanding benefits, conditions, and support channels is part of travelling with greater confidence.',
      sections: [
        {
          heading: 'Insurance is not just a line at the end of an itinerary',
          paragraphs: [
            'When reviewing cover, take time to understand the scope, conditions, exclusions, and the contact route for support. Every product has its own limits; knowing them early prevents the wrong expectation.',
            'Ask for a plain-language explanation before departure if anything is unclear.',
          ],
        },
        {
          heading: 'Save information before you need it',
          paragraphs: [
            'Keep the policy, support number, and relevant documents somewhere easy to reach. In a stressful moment, having the right details at hand makes the conversation much easier.',
            'Do not wait until the airport to search for the contact number.',
          ],
        },
        {
          heading: 'Good support begins with listening',
          paragraphs: [
            'Not every situation has a ready-made answer. A thoughtful care team helps you understand the next option, documents that may be needed, and who is handling each part.',
            'Clarity when support is needed matters as much as excitement while planning.',
          ],
        },
        {
          heading: 'Prepare for confidence, not worry',
          paragraphs: [
            'Reading carefully is not about expecting the worst. It is about travelling with a stronger sense of control.',
          ],
        },
      ],
    },
  },
  {
    slug: 'fast-track-airport-services-khi-nao-nen-su-dung',
    vi: {
      title: 'Khi nào fast-track sân bay thực sự hữu ích?',
      description:
        'Đôi khi thứ làm chuyến đi nhẹ nhàng hơn không phải là đi nhanh hơn, mà là biết trước mình sẽ được hỗ trợ ở đâu.',
      sections: [
        {
          heading: 'Những lúc một hành trình cần bớt ma sát',
          paragraphs: [
            'Fast-track có thể phù hợp khi bạn có thời gian nối chuyến ngắn, đi cùng trẻ nhỏ hoặc người lớn tuổi, vừa kết thúc một chuyến bay dài, hay đơn giản là muốn có thêm sự chủ động ở sân bay đông người.',
            'Điều quan trọng là hiểu đúng dịch vụ dành cho khu vực và hành trình của bạn.',
          ],
        },
        {
          heading: 'Hỏi rõ điểm gặp và phần việc hỗ trợ',
          paragraphs: [
            'Trước khi xác nhận, hãy biết bạn sẽ gặp nhân sự ở đâu, dịch vụ bắt đầu và kết thúc ở bước nào, cũng như thông tin nào cần gửi trước. Những chi tiết này giúp kỳ vọng của bạn khớp với trải nghiệm thực tế.',
            'Nếu chuyến bay thay đổi, hãy thông báo theo đúng kênh được hướng dẫn.',
          ],
        },
        {
          heading: 'Không phải chuyến đi nào cũng cần fast-track',
          paragraphs: [
            'Nếu lịch trình thong thả và bạn quen với sân bay, hỗ trợ này có thể không cần thiết. Nhưng trong những ngày di chuyển dày hoặc có yêu cầu riêng, nó có thể giúp bạn giữ được năng lượng cho phần quan trọng hơn của chuyến đi.',
            'Hãy chọn dịch vụ vì nó hợp với nhịp của bạn, không chỉ vì nghe có vẻ tiện.',
          ],
        },
        {
          heading: 'Một cuộc trao đổi ngắn có thể tiết kiệm nhiều thời gian',
          paragraphs: [
            'Cung cấp hành trình, số lượng khách và nhu cầu hỗ trợ để đội ngũ chuyên môn kiểm tra phương án phù hợp trước khi bạn chốt.',
          ],
        },
      ],
    },
    en: {
      title: 'When is airport fast-track genuinely useful?',
      description:
        'Sometimes a smoother journey is less about moving faster and more about knowing where support will be waiting.',
      sections: [
        {
          heading: 'When a journey needs less friction',
          paragraphs: [
            'Fast-track can be useful for a short connection, travel with children or older relatives, the end of a long flight, or simply a day when you want more certainty in a busy airport.',
            'The important part is understanding which service fits your airport and itinerary.',
          ],
        },
        {
          heading: 'Clarify the meeting point and service scope',
          paragraphs: [
            'Before confirming, know where you will meet the team, where support begins and ends, and what information must be sent ahead. These details keep expectations aligned with the real experience.',
            'If a flight changes, notify the service through the agreed channel.',
          ],
        },
        {
          heading: 'Not every trip needs fast-track',
          paragraphs: [
            'With a relaxed schedule and a familiar airport, you may not need it. On demanding travel days or with particular needs, however, it can preserve energy for the parts of the trip that matter more.',
            'Choose the service because it suits your pace, not simply because it sounds convenient.',
          ],
        },
        {
          heading: 'A short conversation can save time later',
          paragraphs: [
            'Share your itinerary, party size, and support needs so a specialist can check the most suitable option before you confirm.',
          ],
        },
      ],
    },
  },
  {
    slug: 'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings',
    vi: {
      title: 'Một chuyến đi đoàn tốt bắt đầu từ việc hiểu đúng mục tiêu của cả nhóm',
      description:
        'MICE và hành trình đoàn cần nhiều hơn một lịch trình: chúng cần một cách điều phối phù hợp với con người.',
      sections: [
        {
          heading: 'Mỗi đoàn đều có một nhịp riêng',
          paragraphs: [
            'Có đoàn đi để gắn kết, có đoàn để tri ân, có đoàn cần gặp gỡ đối tác và có đoàn chỉ cần một khoảng nghỉ cùng nhau. Khi mục tiêu được nói rõ từ đầu, chương trình mới có thể cân bằng giữa công việc, trải nghiệm và thời gian tự do.',
            'Một lịch trình chung không nên khiến mọi người cảm thấy mình chỉ đang đi theo đoàn.',
          ],
        },
        {
          heading: 'Điều phối là phần ít nhìn thấy nhưng rất quan trọng',
          paragraphs: [
            'Từ giờ đón, lưu trú, bữa ăn, không gian họp đến phương án dự phòng, những chi tiết hậu trường quyết định cảm nhận của khách. Điều phối tốt giúp người tham gia có thể tập trung vào cuộc gặp gỡ và trải nghiệm.',
            'Vì vậy, một brief càng rõ càng giúp đề xuất càng sát.',
          ],
        },
        {
          heading: 'Đề xuất nên nói bằng ngôn ngữ của mục tiêu',
          paragraphs: [
            'Thay vì bắt đầu bằng một danh sách dịch vụ, hãy bắt đầu bằng câu hỏi: sau chuyến đi này, nhóm muốn mang về điều gì? Câu trả lời có thể thay đổi hoàn toàn cách thiết kế hoạt động, không gian và nhịp di chuyển.',
            'Một đề xuất tốt cho phép người ra quyết định nhìn thấy cả bức tranh lẫn các chi tiết cần chốt.',
          ],
        },
        {
          heading: 'Hãy chia sẻ những ràng buộc sớm',
          paragraphs: [
            'Số lượng khách, ngân sách dự kiến, thời gian, yêu cầu ăn ở và mức độ riêng tư đều là dữ liệu hữu ích. Chúng giúp đội ngũ tư vấn xây dựng phương án thực tế ngay từ vòng đầu.',
          ],
        },
      ],
    },
    en: {
      title: 'A strong group journey begins by understanding what the group is there for',
      description:
        'MICE and group travel need more than an itinerary; they need coordination that respects the people involved.',
      sections: [
        {
          heading: 'Every group has its own rhythm',
          paragraphs: [
            'Some groups travel to reconnect, some to reward a team, some to meet partners, and some simply to share time away. Once the goal is clear, a programme can balance work, experience, and free time.',
            'A shared itinerary should not make people feel they are merely following the crowd.',
          ],
        },
        {
          heading: 'Coordination is invisible — and essential',
          paragraphs: [
            'Transfers, stays, meals, meeting space, and contingencies all shape how a group feels. Good coordination lets participants focus on the people and purpose in front of them.',
            'That is why a clear brief produces a more useful proposal.',
          ],
        },
        {
          heading: 'A proposal should speak the language of the objective',
          paragraphs: [
            'Rather than beginning with a list of services, begin with one question: what should the group take away from this journey? The answer can reshape activities, spaces, and pace.',
            'A useful proposal lets decision-makers see both the whole picture and the details that need agreement.',
          ],
        },
        {
          heading: 'Share constraints early',
          paragraphs: [
            'Group size, working budget, timing, accommodation needs, and privacy expectations all help a specialist build a realistic first option.',
          ],
        },
      ],
    },
  },
  {
    slug: 'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
    vi: {
      title: 'Bạn nên bắt đầu hành trình cùng WingsGroup từ đâu?',
      description:
        'Một câu hỏi đúng ngay từ đầu giúp bạn gặp đúng đội ngũ và nhận được tư vấn sát với nhu cầu hơn.',
      sections: [
        {
          heading: 'Khi bạn muốn xem tour và ngày khởi hành',
          paragraphs: [
            'Nếu bạn đang tìm chuyến đi theo lịch, muốn so sánh chương trình hoặc cân nhắc một mùa cụ thể, WingsGo là nơi phù hợp để bắt đầu. Bạn có thể đi từ cảm hứng đến thông tin thực tế một cách rõ ràng hơn.',
            'Khi đã có điểm đến trong đầu, việc trao đổi sẽ nhanh hơn.',
          ],
        },
        {
          heading: 'Khi bạn muốn một hành trình Việt Nam theo cách riêng',
          paragraphs: [
            'Nếu bạn muốn đi sâu vào điểm đến, nhịp sống và trải nghiệm phù hợp với mình, WingSide là không gian để bắt đầu câu chuyện. Hành trình có thể được xây từ sở thích, thời gian và cách bạn muốn di chuyển.',
            'Đôi khi một vài câu chia sẻ ban đầu đã đủ để mở ra hướng đi rất khác.',
          ],
        },
        {
          heading: 'Khi nhu cầu là dịch vụ riêng hoặc hỗ trợ',
          paragraphs: [
            'Fast-track sân bay, hành trình private, MICE hay hỗ trợ sau bán đều cần những cuộc trao đổi khác nhau. WingsGroup giúp bạn đi tới đúng đội ngũ thay vì phải tự đoán từ một danh sách dài.',
            'Bạn không cần phải biết chính xác tên dịch vụ trước khi liên hệ.',
          ],
        },
        {
          heading: 'Khi vẫn còn phân vân',
          paragraphs: [
            'Hãy bắt đầu bằng điều bạn đang cần nhất: một chuyến đi, một cuộc gặp, sự hỗ trợ ở sân bay hay một phương án riêng. Phần còn lại có thể cùng làm rõ trong cuộc tư vấn.',
          ],
        },
      ],
    },
    en: {
      title: 'Where should you begin your journey with WingsGroup?',
      description:
        'One good question at the start can connect you with the right team and a more relevant conversation.',
      sections: [
        {
          heading: 'When you want to explore tours and departure dates',
          paragraphs: [
            'If you are looking for a scheduled trip, comparing programmes, or considering a particular season, WingsGo is a natural place to begin. It helps move from inspiration to practical detail with more clarity.',
            'Once a destination is in mind, the conversation becomes faster.',
          ],
        },
        {
          heading: 'When you want to experience Vietnam in your own way',
          paragraphs: [
            'If you want to explore destinations, pace, and experiences that fit you, WingSide is a place to begin the story. A journey can grow from your interests, time, and preferred way of moving.',
            'Sometimes a few early thoughts are enough to open a very different direction.',
          ],
        },
        {
          heading: 'When you need a specialist service or support',
          paragraphs: [
            'Airport fast-track, private travel, MICE, and after-sales support each call for a different conversation. WingsGroup can guide you to the appropriate team instead of asking you to decode a long service list.',
            'You do not need to know the exact service name before you get in touch.',
          ],
        },
        {
          heading: 'When you are still deciding',
          paragraphs: [
            'Start with what matters most right now: a trip, a meeting, airport support, or a private idea. The rest can become clearer in conversation.',
          ],
        },
      ],
    },
  },
  {
    slug: 'he-sinh-thai-wingsgroup-la-gi',
    vi: {
      title: 'Hệ sinh thái WingsGroup là gì và có thể giúp bạn bắt đầu từ đâu?',
      description:
        'Một cách nhìn đơn giản về các đội ngũ trong WingsGroup để bạn tìm được đúng điểm bắt đầu cho nhu cầu của mình.',
      sections: [
        {
          heading: 'Một điểm chạm, nhiều hướng đi rõ ràng',
          paragraphs: [
            'WingsGroup kết nối những đội ngũ có chuyên môn khác nhau trong hành trình, dịch vụ riêng và hỗ trợ du lịch. Thay vì phải tự dò tìm giữa nhiều lựa chọn, bạn có thể bắt đầu bằng nhu cầu thực tế của mình.',
            'Điều quan trọng không phải là nhớ hết tên dịch vụ, mà là biết mình đang cần một chuyến đi, một phương án riêng hay sự hỗ trợ cho một chặng cụ thể.',
          ],
        },
        {
          heading: 'Mỗi đội ngũ giải quyết một phần việc khác nhau',
          paragraphs: [
            'Có nơi phù hợp để tham khảo tour và ngày khởi hành; có nơi dành cho hành trình thiết kế riêng tại Việt Nam; cũng có những nhóm chuyên xử lý nhu cầu sân bay, đoàn doanh nghiệp hoặc chăm sóc sau bán.',
            'Cách phân chia này giúp cuộc trao đổi đi thẳng vào chuyên môn cần thiết thay vì bắt đầu lại từ đầu ở mỗi điểm liên hệ.',
          ],
        },
        {
          heading: 'Bạn không cần tự chọn thật chính xác ngay từ đầu',
          paragraphs: [
            'Một vài dòng về thời gian, số người đi, điểm đến mong muốn và điều bạn đang băn khoăn thường đã đủ để đội ngũ tư vấn định hướng. Nếu nhu cầu giao nhau giữa nhiều dịch vụ, WingsGroup sẽ giúp kết nối đúng đầu mối.',
            'Một cuộc trao đổi rõ ràng từ đầu cũng giúp đề xuất thực tế hơn về thời gian, ngân sách và mức độ hỗ trợ.',
          ],
        },
        {
          heading: 'Bắt đầu từ điều quan trọng nhất với bạn',
          paragraphs: [
            'Hãy chia sẻ điều bạn muốn làm được: chọn một chuyến đi, xây một hành trình riêng, tổ chức đoàn hay chuẩn bị một chặng di chuyển. Phần còn lại có thể được làm rõ cùng chuyên viên phù hợp.',
          ],
        },
      ],
    },
    en: {
      title: 'What is the WingsGroup ecosystem — and where should you begin?',
      description:
        'A simple view of the teams within WingsGroup, so you can begin with the service that fits your actual need.',
      sections: [
        {
          heading: 'One starting point, several clear directions',
          paragraphs: [
            'WingsGroup brings together teams with different strengths across journeys, specialist services, and travel support. Instead of navigating a long list alone, you can start with the need in front of you.',
            'You do not need to remember every service name. It is enough to know whether you need a trip, a private plan, or support for a particular stage.',
          ],
        },
        {
          heading: 'Each team handles a different part of the journey',
          paragraphs: [
            'One team may be the right place to explore tours and departure dates; another can shape a tailor-made Vietnam journey. Other specialists focus on airport needs, corporate groups, or after-sales care.',
            'That structure lets the conversation reach the right expertise without asking you to begin again at every contact point.',
          ],
        },
        {
          heading: 'You do not have to choose perfectly at the start',
          paragraphs: [
            'A few details about timing, party size, destination, and the question on your mind are usually enough for an adviser to point you in the right direction. When a need spans several services, WingsGroup can make the connection.',
            'A clear early conversation also leads to a more realistic proposal on timing, budget, and support.',
          ],
        },
        {
          heading: 'Begin with what matters most to you',
          paragraphs: [
            'Tell us what you want to achieve: choose a trip, build a private journey, organise a group, or prepare a travel day. The right specialist can help clarify the rest.',
          ],
        },
      ],
    },
  },
  {
    slug: '5-site-trong-he-wingsgroup-khac-nhau-ra-sao',
    vi: {
      title: 'Các site trong hệ WingsGroup khác nhau ra sao?',
      description:
        'Mỗi không gian trong hệ sinh thái được thiết kế cho một kiểu nhu cầu khác nhau — đây là cách chọn nơi bắt đầu dễ hơn.',
      sections: [
        {
          heading: 'Đừng chọn theo tên, hãy chọn theo việc bạn cần làm',
          paragraphs: [
            'Các site trong hệ WingsGroup không phải là những bản sao của nhau. Mỗi site có một vai trò riêng để cuộc tìm kiếm của bạn nhanh hơn và cuộc tư vấn đi sâu hơn.',
            'Vì vậy, câu hỏi hữu ích nhất không phải là “site nào tốt hơn”, mà là “mình đang cần giải quyết điều gì?”.',
          ],
        },
        {
          heading: 'Khi bạn muốn khám phá và đặt hành trình theo lịch',
          paragraphs: [
            'WingsGo phù hợp khi bạn muốn xem chương trình, ngày khởi hành và những lựa chọn sẵn có. Đây là nơi thuận tiện để so sánh hành trình trước khi quyết định.',
            'Nếu bạn đã có một mùa, điểm đến hoặc khung thời gian trong đầu, hãy bắt đầu tại đây.',
          ],
        },
        {
          heading: 'Khi bạn cần trải nghiệm hoặc dịch vụ theo yêu cầu riêng',
          paragraphs: [
            'WingSide phù hợp cho hành trình Việt Nam thiết kế riêng. Những nhu cầu như airport fast-track, private journey, đoàn MICE hoặc hỗ trợ care sẽ được kết nối với nhóm chuyên môn phù hợp trong hệ sinh thái.',
            'Mỗi yêu cầu riêng cần thông tin khác nhau; hãy chia sẻ điều quan trọng nhất để nhận được đề xuất sát hơn.',
          ],
        },
        {
          heading: 'Khi vẫn chưa rõ, hãy để nhu cầu dẫn đường',
          paragraphs: [
            'Bạn có thể bắt đầu từ WingsGroup và mô tả ngắn gọn điều mình cần. Đội ngũ sẽ giúp bạn tìm đúng site và đúng người để tiếp tục cuộc trao đổi.',
          ],
        },
      ],
    },
    en: {
      title: 'How do the sites in the WingsGroup ecosystem differ?',
      description:
        'Each space in the ecosystem is designed for a different kind of need. Here is a simpler way to choose where to begin.',
      sections: [
        {
          heading: 'Choose by what you need to do, not by the name',
          paragraphs: [
            'The WingsGroup sites are not copies of one another. Each has a distinct role, helping you search faster and have a more relevant conversation.',
            'The useful question is not “which site is better?” but “what am I trying to solve right now?”.',
          ],
        },
        {
          heading: 'When you want to explore scheduled journeys',
          paragraphs: [
            'WingsGo is a useful starting point when you want to browse programmes, departure dates, and ready-to-consider options. It is designed to make comparison easier before you decide.',
            'If you already have a season, destination, or time window in mind, begin there.',
          ],
        },
        {
          heading: 'When you need an experience or service shaped around you',
          paragraphs: [
            'WingSide is suited to tailor-made Vietnam journeys. Airport fast-track, private travel, MICE groups, and care support can be connected to the relevant specialist team within the ecosystem.',
            'Each tailored request needs different information, so share the part that matters most to receive a closer recommendation.',
          ],
        },
        {
          heading: 'When you are not yet sure, let the need lead',
          paragraphs: [
            'You can begin with WingsGroup and describe what you need in a few words. The team can help you find the right site and person for the next conversation.',
          ],
        },
      ],
    },
  },
]

const editorialDepth: Record<string, Record<'vi' | 'en', Section[]>> = {
  'he-sinh-thai-wingsgroup-la-gi': {
    vi: [
      {
        heading: 'Ba thông tin giúp cuộc tư vấn bắt đầu nhanh hơn',
        paragraphs: [
          'Hãy chuẩn bị khoảng thời gian dự kiến, số người đi và mức độ linh hoạt của kế hoạch. Đây là ba dữ liệu đủ để phân biệt một nhu cầu tham khảo ban đầu với một yêu cầu cần thiết kế kỹ hơn.',
          'Nếu chưa có ngân sách chính xác, một khoảng ngân sách thay vì một con số cố định cũng hữu ích. Nó giúp đội ngũ tư vấn đưa ra lựa chọn có thể thực hiện, thay vì chỉ đưa ra một danh sách dài.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Tôi có cần chọn đúng site trước không? Không. Bạn có thể nêu nhu cầu tại WingsGroup; đội ngũ sẽ kết nối đúng chuyên môn. Tôi có thể hỏi nhiều dịch vụ trong một lần không? Có, đặc biệt khi hành trình có nhiều chặng hoặc nhiều người cùng đi.',
        ],
      },
    ],
    en: [
      {
        heading: 'Three details that make the first conversation faster',
        paragraphs: [
          'Share your likely dates, party size, and how flexible the plan can be. Those three details are enough to distinguish early research from a journey that needs closer design.',
          'If the budget is not fixed, a range is still useful. It helps an adviser make practical choices instead of sending a long, unfocused list.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Do I need to choose the right site first? No. Start with your need and WingsGroup can connect the relevant specialist. Can I ask about several services at once? Yes, especially when a journey has several stages or travellers.',
        ],
      },
    ],
  },
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': {
    vi: [
      {
        heading: 'Một cách chọn nhanh trong chưa đến một phút',
        paragraphs: [
          'Bạn đang so sánh lịch khởi hành? Bắt đầu ở nơi có chương trình theo lịch. Bạn muốn thiết kế theo nhịp riêng? Hãy mô tả trải nghiệm, thời gian và người đồng hành. Bạn cần hỗ trợ một chặng cụ thể? Nêu rõ sân bay, giờ bay hoặc bối cảnh đoàn.',
          'Việc chọn đúng điểm chạm không ràng buộc bạn vào một phương án. Nó chỉ giúp cuộc trao đổi đầu tiên có nhiều thông tin hữu ích hơn.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Tôi có cần tạo nhiều yêu cầu không? Không cần; một yêu cầu rõ ràng có thể được điều phối tới các nhóm liên quan. Tôi có thể chuyển từ tour theo lịch sang hành trình riêng không? Có, khi nhu cầu thực tế của bạn thay đổi.',
        ],
      },
    ],
    en: [
      {
        heading: 'A quicker way to choose in under a minute',
        paragraphs: [
          'Comparing departure dates? Begin with scheduled programmes. Want a journey at your own pace? Describe the experience, timing, and travellers. Need support for one stage? Share the airport, flight timing, or group context.',
          'Choosing the right starting point does not lock you into an option. It simply gives the first conversation more useful context.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Do I need to submit several enquiries? No. One clear enquiry can be coordinated with the relevant teams. Can I move from a scheduled tour to a private journey? Yes, when your actual needs change.',
        ],
      },
    ],
  },
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': {
    vi: [
      {
        heading: 'Một brief ngắn nhưng hữu ích nên có gì?',
        paragraphs: [
          'Bạn không cần viết một kế hoạch hoàn chỉnh. Điểm đến hoặc loại trải nghiệm, thời gian dự kiến, số người đi và một ưu tiên chính là đủ cho vòng đầu.',
          'Hãy nói thêm điều bạn muốn tránh: đổi khách sạn quá nhiều, chuyến bay quá sớm, lịch dày hoặc yêu cầu ăn uống. Những chi tiết này thường thay đổi chất lượng đề xuất nhiều hơn một danh sách điểm đến.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Nếu tôi chưa chốt ngày đi thì sao? Hãy chia sẻ khoảng thời gian và mức linh hoạt. Nếu tôi chỉ cần hỗ trợ sân bay thì sao? Nêu sân bay, chặng bay và số khách để được kiểm tra dịch vụ phù hợp.',
        ],
      },
    ],
    en: [
      {
        heading: 'What belongs in a short but useful brief?',
        paragraphs: [
          'You do not need a finished plan. A destination or experience type, likely dates, party size, and one main priority are enough for the first step.',
          'Also share what you would prefer to avoid: frequent hotel changes, very early flights, packed days, or dietary needs. These details often improve a proposal more than a long destination list.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'What if my dates are not fixed? Share a time range and flexibility. What if I only need airport support? Provide the airport, flight sector, and party size so the relevant option can be checked.',
        ],
      },
    ],
  },
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': {
    vi: [
      {
        heading: 'Những ràng buộc cần nói sớm với đơn vị tổ chức',
        paragraphs: [
          'Ngoài số lượng khách và ngân sách, hãy nêu người ra quyết định, mục tiêu của chuyến đi, khung giờ không thể thay đổi và yêu cầu riêng tư. Đây là những dữ liệu ảnh hưởng trực tiếp tới nơi ở, nhịp chương trình và phương án dự phòng.',
          'Một cuộc họp chuẩn bị ngắn trước khi chốt thường giúp hạn chế những thay đổi tốn kém ở giai đoạn gần ngày khởi hành.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Khi nào nên bắt đầu lên kế hoạch? Càng sớm càng tốt khi đoàn có yêu cầu họp, hoạt động riêng hoặc mùa cao điểm. Có cần một đầu mối phía khách hàng không? Có; một đầu mối giúp xác nhận thay đổi nhất quán.',
        ],
      },
    ],
    en: [
      {
        heading: 'Constraints worth sharing early with an organiser',
        paragraphs: [
          'Alongside party size and budget, share the decision-maker, the purpose of the trip, immovable timings, and privacy needs. These details directly shape accommodation, programme pace, and contingencies.',
          'A short preparation meeting before confirmation often reduces expensive changes close to departure.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'When should group planning begin? As early as possible when meetings, private activities, or peak periods are involved. Does the client need one coordinator? Yes. A single contact keeps changes consistent.',
        ],
      },
    ],
  },
  'fast-track-airport-services-khi-nao-nen-su-dung': {
    vi: [
      {
        heading: 'Kiểm tra trước khi xác nhận dịch vụ fast-track',
        paragraphs: [
          'Hãy đối chiếu nhà ga, chiều bay, giờ bay và số lượng khách. Phạm vi hỗ trợ có thể khác nhau theo sân bay và theo từng chặng đến hoặc đi; đừng suy ra từ tên dịch vụ.',
          'Giữ lại xác nhận dịch vụ cùng số liên hệ ngày khởi hành. Khi lịch bay thay đổi, gửi thông tin mới ngay theo kênh đã thống nhất để đội ngũ kiểm tra lại khả năng phục vụ.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Fast-track có thay thế thủ tục an ninh hoặc xuất nhập cảnh không? Không; dịch vụ hỗ trợ quy trình trong phạm vi được phép, còn yêu cầu của cơ quan chức năng vẫn áp dụng. Tôi nên đặt trước bao lâu? Nên hỏi ngay khi có hành trình vì năng lực phục vụ phụ thuộc vào sân bay và thời điểm.',
        ],
      },
    ],
    en: [
      {
        heading: 'What to check before confirming fast-track',
        paragraphs: [
          'Confirm the terminal, flight direction, flight time, and party size. Service scope can differ by airport and by arrival or departure; do not infer it from the service name alone.',
          'Keep the confirmation and the travel-day contact. If a flight changes, send the updated information through the agreed channel so availability can be checked again.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Does fast-track replace security or immigration requirements? No. It supports the process within what is permitted; authority requirements still apply. How early should I book? Ask as soon as you have an itinerary, because capacity depends on the airport and timing.',
        ],
      },
    ],
  },
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': {
    vi: [
      {
        heading: 'Đọc quyền lợi theo tình huống của chính bạn',
        paragraphs: [
          'Đừng chỉ xem tên quyền lợi. Hãy kiểm tra mức chi trả, điều kiện kích hoạt, hồ sơ yêu cầu và trường hợp loại trừ có liên quan tới độ tuổi, hoạt động hoặc điểm đến của bạn.',
          'Nếu có bệnh nền, hành lý giá trị hoặc lịch trình đặc thù, hãy hỏi nhà cung cấp bảo hiểm hoặc chuyên viên được ủy quyền trước khi đi. Bài viết này là hướng dẫn chuẩn bị, không thay thế điều khoản hợp đồng.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Khi xảy ra sự cố tôi nên làm gì trước? Ưu tiên an toàn, liên hệ số hỗ trợ ghi trên hợp đồng và lưu chứng từ liên quan. Tôi có thể chỉ dựa vào tư vấn miệng không? Không; hãy dùng điều khoản và xác nhận bằng văn bản làm căn cứ.',
        ],
      },
    ],
    en: [
      {
        heading: 'Read cover through your own travel situation',
        paragraphs: [
          'Do not only read the benefit name. Check limits, trigger conditions, claim documents, and exclusions relevant to your age, activities, or destination.',
          'If you have pre-existing conditions, valuable belongings, or an unusual itinerary, ask the insurer or an authorised adviser before departure. This article is preparation guidance, not a substitute for policy wording.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'What should I do first if something happens? Put safety first, contact the assistance number in the policy, and keep relevant records. Can I rely only on verbal advice? No. Use the policy wording and written confirmation as the reference.',
        ],
      },
    ],
  },
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': {
    vi: [
      {
        heading: 'Một quy trình kiểm tra gọn trước khi thanh toán',
        paragraphs: [
          'Lưu báo giá, điều kiện dịch vụ và thông tin tài khoản nhận tiền cùng một nơi. Sau đó đối chiếu tên đơn vị trên các tài liệu này với đầu mối trao đổi và chứng từ dự kiến nhận.',
          'Nếu một thông tin quan trọng chưa khớp, hãy tạm dừng để làm rõ bằng văn bản. Việc kiểm tra nên được làm ngay trước khi thanh toán, vì thông tin vận hành có thể thay đổi.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Ảnh quảng bá có phải là cam kết dịch vụ không? Không; chỉ các hạng mục được xác nhận trong đề xuất hoặc điều khoản mới là căn cứ. Tôi cần lưu gì sau khi đặt? Lưu xác nhận, chứng từ thanh toán và đầu mối hỗ trợ.',
        ],
      },
    ],
    en: [
      {
        heading: 'A short verification process before you pay',
        paragraphs: [
          'Keep the proposal, service terms, and receiving-account information together. Then compare the entity named in those documents with your contact and the records you expect to receive.',
          'If an important detail does not match, pause and ask for written clarification. Make the check immediately before payment, as operating information can change.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Is marketing imagery a service commitment? No. Only items confirmed in the proposal or terms are a reference. What should I keep after booking? Keep the confirmation, payment records, and support contact.',
        ],
      },
    ],
  },
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': {
    vi: [
      {
        heading: 'Đừng để những chi tiết nhỏ bị bỏ quên',
        paragraphs: [
          'Trước khi xác nhận, kiểm tra tên khách, ngày sử dụng dịch vụ, tiêu chuẩn phòng hoặc vé, và các yêu cầu đặc biệt. Một lỗi nhỏ ở thời điểm này thường dễ chỉnh hơn nhiều so với khi đã di chuyển.',
          'Đọc lại bản xác nhận cuối cùng như người sẽ trực tiếp sử dụng dịch vụ, không chỉ như người đặt. Cách đọc này thường làm lộ ra những câu hỏi cần hỏi thêm.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Tôi nên so sánh hai đề xuất bằng cách nào? So sánh phạm vi dịch vụ, điều kiện thay đổi và nhịp lịch trình trước khi so sánh giá cuối. Khi nào nên xác nhận? Khi các điểm quan trọng đã được ghi nhận bằng văn bản.',
        ],
      },
    ],
    en: [
      {
        heading: 'Do not let small details go unnoticed',
        paragraphs: [
          'Before confirming, check traveller names, service dates, room or ticket standards, and special requirements. A small error at this stage is usually much easier to resolve than while travelling.',
          'Read the final confirmation as the person who will use the service, not only as the person making the booking. That perspective often reveals the right follow-up questions.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'How should I compare two proposals? Compare scope, change terms, and itinerary pace before comparing the final price. When should I confirm? When the important points are recorded in writing.',
        ],
      },
    ],
  },
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': {
    vi: [
      {
        heading: 'Khi nào một hành trình riêng đáng để đầu tư?',
        paragraphs: [
          'Hành trình riêng thường phù hợp khi nhịp đi, quyền riêng tư, điểm dừng hoặc sự hỗ trợ cần được thiết kế theo một nhóm cụ thể. Giá trị của nó nằm ở những quyết định phù hợp hơn, không chỉ ở việc thêm nhiều hạng mục.',
          'Để so sánh đúng, hãy yêu cầu đề xuất giải thích điều gì được điều chỉnh cho nhóm của bạn và điều gì vẫn phụ thuộc vào mùa, năng lực đối tác hoặc quy định địa phương.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Private journey có phải lúc nào cũng xa hoa không? Không; đây là cách thiết kế theo nhu cầu, có thể áp dụng ở nhiều mức ngân sách. Tôi nên chia sẻ gì trước? Nhịp sinh hoạt, người đồng hành, ưu tiên và những điều muốn tránh.',
        ],
      },
    ],
    en: [
      {
        heading: 'When is a private journey worth the investment?',
        paragraphs: [
          'A private journey can be useful when pace, privacy, stops, or support need to be shaped around a particular group. Its value lies in better decisions for that group, not simply in adding more items.',
          'To compare fairly, ask a proposal to explain what is tailored to your party and what still depends on seasonality, partner capacity, or local rules.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Is private travel always luxurious? No. It is a way of designing around needs and can work at different budgets. What should I share first? Your daily rhythm, companions, priorities, and what you prefer to avoid.',
        ],
      },
    ],
  },
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': {
    vi: [
      {
        heading: 'Thiết kế tuyến đường dựa trên thời gian di chuyển thật',
        paragraphs: [
          'Việt Nam có nhiều lớp trải nghiệm, nhưng quãng đường và điều kiện thời tiết có thể làm thay đổi cảm nhận của một ngày đi. Một tuyến phù hợp thường chọn ít chặng hơn và dành thời gian đủ dài cho mỗi điểm dừng.',
          'Hãy coi lịch trình là một giả định cần kiểm tra theo mùa và giờ bay, thay vì một cam kết cứng không thể điều chỉnh.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Có nên đi nhiều vùng trong một chuyến không? Có thể, nếu thời gian cho phép và các chặng nối nhau hợp lý. Tôi nên bắt đầu lên kế hoạch từ đâu? Từ số ngày thực có và trải nghiệm bạn muốn ưu tiên nhất.',
        ],
      },
    ],
    en: [
      {
        heading: 'Design a route around real travel time',
        paragraphs: [
          'Vietnam has many layers of experience, but distance and weather can change how a travel day feels. A suitable route often chooses fewer transitions and leaves enough time at each stop.',
          'Treat an itinerary as an assumption to test against season and flight timing, not as a rigid promise that can never change.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Should I cover several regions in one trip? You can if time allows and the connections are sensible. Where should planning start? With the days you truly have and the experience you most want to prioritise.',
        ],
      },
    ],
  },
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': {
    vi: [
      {
        heading: 'So sánh chương trình bằng những câu hỏi đúng',
        paragraphs: [
          'Khi xem các chương trình tương tự, hãy hỏi số giờ di chuyển mỗi ngày, điểm nào chỉ dừng chụp ảnh, thời gian tự do nằm ở đâu và các bữa ăn có thể thay đổi thế nào. Những câu hỏi này cho thấy nhịp thật của chuyến đi.',
          'Với thị thực, yêu cầu nhập cảnh và quy định hàng không, hãy kiểm tra thông tin hiện hành từ cơ quan có thẩm quyền hoặc người phụ trách hồ sơ trước khi quyết định.',
        ],
      },
      {
        heading: 'Câu hỏi thường gặp',
        paragraphs: [
          'Điểm đến nào phù hợp nhất? Không có đáp án chung; hãy bắt đầu từ thời gian, mùa đi và điều bạn muốn trải nghiệm. Tôi có cần hỏi về visa sớm không? Có, vì yêu cầu có thể thay đổi và ảnh hưởng tới mốc chuẩn bị.',
        ],
      },
    ],
    en: [
      {
        heading: 'Compare programmes through the right questions',
        paragraphs: [
          'When comparing similar programmes, ask about daily transfer time, photo stops, free time, and how meals may change. These questions reveal the real pace of the journey.',
          'For visas, entry requirements, and airline rules, check current information with the relevant authority or the person handling your application before deciding.',
        ],
      },
      {
        heading: 'Frequently asked questions',
        paragraphs: [
          'Which destination is best? There is no universal answer; begin with timing, season, and the experience you want. Should I ask about visas early? Yes. Requirements can change and affect your preparation timeline.',
        ],
      },
    ],
  },
}

const editorialExpansion: Record<string, Record<'vi' | 'en', Section>> = {
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': {
    vi: {
      heading: 'Biến việc kiểm tra thành một thói quen dễ làm',
      paragraphs: [
        'Hãy tạo một thư mục nhỏ cho chuyến đi, lưu cùng lúc báo giá, điều kiện dịch vụ, xác nhận trao đổi và chứng từ thanh toán. Khi cần đối chiếu, bạn sẽ nhìn được toàn bộ câu chuyện thay vì phải tìm lại từng tin nhắn. Cách chuẩn bị này đặc biệt hữu ích khi nhiều người cùng ra quyết định hoặc khi hành trình có nhiều nhà cung cấp.',
        'Nếu một chi tiết chưa thể xác nhận ngay, ghi rõ nó là “đang chờ xác nhận” thay vì tự suy đoán. Sự rõ ràng không làm chậm quá trình đặt dịch vụ; ngược lại, nó giúp quyết định sau cùng có căn cứ và giúp hai bên xử lý phát sinh công bằng hơn.',
      ],
    },
    en: {
      heading: 'Make verification an easy habit',
      paragraphs: [
        'Keep the proposal, terms, confirmations, and payment records in one simple trip folder. It lets you compare the full picture rather than searching through separate messages, especially when several people are deciding together or several suppliers are involved.',
        'When a detail cannot yet be confirmed, mark it as pending instead of assuming. Clarity does not slow a booking down; it gives the final decision a sound basis and makes later changes fairer for everyone.',
      ],
    },
  },
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': {
    vi: {
      heading: 'Một lần rà soát cuối trước khi nói đồng ý',
      paragraphs: [
        'Ở bước cuối, hãy đọc lại hành trình theo thứ tự thời gian: bạn sẽ gặp ai, đi đâu, dùng dịch vụ nào và cần tự chuẩn bị điều gì. Cách đọc này giúp phát hiện những khoảng trống mà bảng giá có thể chưa cho thấy, chẳng hạn thời gian nối chuyến, yêu cầu đặc biệt hoặc mốc thanh toán.',
        'Nếu đi cùng gia đình hoặc đồng nghiệp, hãy chia sẻ bản xác nhận cuối cùng với những người có liên quan. Mỗi người có thể nhìn ra một chi tiết khác nhau; mục tiêu không phải tạo thêm việc, mà là để cả nhóm bắt đầu chuyến đi cùng một hiểu biết.',
      ],
    },
    en: {
      heading: 'One final review before saying yes',
      paragraphs: [
        'At the final stage, read the journey in time order: who you meet, where you go, which services are used, and what you need to prepare. This reveals gaps a price list can hide, such as connection time, special requirements, or payment milestones.',
        'Share the final confirmation with family or colleagues who are involved. Each person may spot a different detail; the aim is not to create extra work but to let the group begin with the same understanding.',
      ],
    },
  },
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': {
    vi: {
      heading: 'Đánh giá một đề xuất riêng bằng trải nghiệm thực tế',
      paragraphs: [
        'Khi nhận một đề xuất private journey, hãy nhìn vào nhịp của từng ngày thay vì chỉ đếm số hạng mục. Có đủ thời gian nghỉ sau chuyến bay không, quãng đường có hợp với nhóm không, và những khoảng trống trong lịch có chủ đích hay không? Những câu hỏi này cho thấy mức độ chăm chút của thiết kế.',
        'Một hành trình riêng tốt cũng cần có phương án thay đổi khi thời tiết, sức khỏe hoặc sở thích của nhóm dịch chuyển. Hãy thống nhất từ đầu ai có quyền điều chỉnh và chi tiết nào cần được xác nhận lại, để sự linh hoạt vẫn đi cùng sự minh bạch.',
      ],
    },
    en: {
      heading: 'Judge a private proposal by the real experience',
      paragraphs: [
        'When reviewing a private journey, look at the rhythm of each day rather than counting inclusions. Is there time to recover after a flight, do transfers suit the group, and are open moments intentional? These questions reveal how carefully the experience has been designed.',
        'A good private journey also has room for weather, health, or changing preferences. Agree early who can adjust the plan and what must be reconfirmed, so flexibility remains transparent.',
      ],
    },
  },
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': {
    vi: {
      heading: 'Để Việt Nam được cảm nhận thay vì chỉ được “đi qua”',
      paragraphs: [
        'Một tuyến Việt Nam thiết kế riêng thường hay hơn khi chọn một vài trải nghiệm đủ sâu: một buổi sáng ở khu phố mình thích, một bữa ăn có thời gian trò chuyện, hoặc một điểm dừng thiên nhiên không phải chạy theo giờ. Nhịp chậm hơn tạo cơ hội để chương trình phản ứng với thời tiết và năng lượng thật của nhóm.',
        'Trước khi chốt, hãy yêu cầu người thiết kế giải thích lý do của từng chặng nối. Khi hiểu vì sao phải bay, đi tàu hoặc ở lại thêm một đêm, bạn có thể chọn được phương án cân bằng tốt hơn giữa độ phủ, sự thoải mái và điều mình thực sự muốn nhớ.',
      ],
    },
    en: {
      heading: 'Experience Vietnam rather than simply passing through it',
      paragraphs: [
        'A tailor-made Vietnam route is often stronger when it chooses a few experiences deeply: a morning in a neighbourhood you enjoy, a meal with time to talk, or a nature stop that is not rushed by the clock. A lighter pace lets the programme respond to weather and the group’s real energy.',
        'Before confirming, ask the designer to explain the reason for each connection. Understanding why a flight, train, or extra night is proposed helps you balance coverage, comfort, and what you genuinely want to remember.',
      ],
    },
  },
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': {
    vi: {
      heading: 'So sánh điểm đến bằng bối cảnh của chính bạn',
      paragraphs: [
        'Hàn Quốc, Nhật Bản và Trung Quốc đều có thể phù hợp, nhưng một lựa chọn chỉ có ý nghĩa khi đặt trong lịch nghỉ, mùa đi, thể lực và sở thích của nhóm. Một hành trình ngắn có thể hợp với một thành phố và vài trải nghiệm rõ ràng hơn là cố gắng gom thật nhiều nơi vào cùng lịch.',
        'Các yêu cầu xuất nhập cảnh, lịch bay và điều kiện địa phương có thể thay đổi. Hãy dùng trang chính thức của cơ quan có thẩm quyền để kiểm tra trước khi thanh toán, và xem tư vấn từ đơn vị tổ chức như một cách hỗ trợ bạn đọc đúng thông tin hiện hành.',
      ],
    },
    en: {
      heading: 'Compare destinations through your own context',
      paragraphs: [
        'Korea, Japan, and China can each work well, but a choice only becomes useful when it fits your leave dates, season, energy, and group interests. On a short trip, one city and a few clear experiences can be more satisfying than trying to fit in too much.',
        'Entry requirements, flights, and local conditions can change. Check official authority information before paying, and use an organiser’s advice to help interpret the current details for your itinerary.',
      ],
    },
  },
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': {
    vi: {
      heading: 'Chuẩn bị để khi cần hỗ trợ không phải bắt đầu từ con số không',
      paragraphs: [
        'Trước khi đi, lưu số hỗ trợ, số hợp đồng, bản chụp giấy tờ và quy trình thông báo của sản phẩm bạn đã mua ở nơi cả nhóm có thể tìm thấy. Việc này không dự đoán điều xấu sẽ xảy ra; nó chỉ giúp bạn không mất thời gian tìm thông tin trong một tình huống căng thẳng.',
        'Đừng dùng một bài viết hay lời tư vấn chung để thay cho điều khoản hợp đồng. Khi quyền lợi quan trọng với chuyến đi của bạn, hãy đọc điều kiện bản đang áp dụng và hỏi trực tiếp bên có thẩm quyền xác nhận trước khi quyết định.',
      ],
    },
    en: {
      heading: 'Prepare so support does not start from zero',
      paragraphs: [
        'Before leaving, keep the assistance number, policy number, document copies, and notification process somewhere the group can find them. This is not predicting trouble; it simply avoids a search for information in a stressful moment.',
        'Do not use a general article or verbal advice in place of the policy wording. When cover matters to your trip, read the current terms and ask the authorised provider to confirm before deciding.',
      ],
    },
  },
  'fast-track-airport-services-khi-nao-nen-su-dung': {
    vi: {
      heading: 'Đặt fast-track khi nó giải quyết một nhu cầu cụ thể',
      paragraphs: [
        'Fast-track có thể đáng cân nhắc khi nhóm có thời gian nối chuyến ngắn, khách lớn tuổi, trẻ nhỏ, nhu cầu hỗ trợ riêng hoặc lịch trình cần sự chủ động hơn ở sân bay. Giá trị nằm ở sự phù hợp với bối cảnh, không phải ở việc dịch vụ nghe có vẻ “cao cấp” hơn.',
        'Khi hỏi dịch vụ, hãy cung cấp mã chuyến bay, ngày giờ, nhà ga và số người. Những thông tin này giúp đội ngũ kiểm tra đúng khả năng phục vụ và nêu rõ phạm vi hỗ trợ, thay vì đưa ra một lời hứa chung chung.',
      ],
    },
    en: {
      heading: 'Book fast-track when it solves a specific need',
      paragraphs: [
        'Fast-track can be worth considering for short connections, older travellers, young children, particular assistance needs, or an itinerary that needs more certainty at the airport. Its value lies in fit, not in sounding more premium.',
        'When asking about service, share the flight number, date and time, terminal, and party size. These details let the team check actual availability and explain the scope rather than making a general promise.',
      ],
    },
  },
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': {
    vi: {
      heading: 'Giữ mục tiêu đoàn là tiêu chí của mọi quyết định',
      paragraphs: [
        'Một chuyến MICE không chỉ là danh sách phòng, xe và nhà hàng. Nếu mục tiêu là gắn kết, đào tạo, tri ân hay gặp đối tác, mục tiêu đó cần được chuyển thành nhịp chương trình, không gian và thời lượng phù hợp. Khi mọi người hiểu điều này từ đầu, các lựa chọn vận hành sẽ nhất quán hơn.',
        'Nên có một bảng quyết định ngắn nêu rõ ai duyệt ngân sách, ai xác nhận danh sách khách và cách xử lý thay đổi. Điều đó giúp đơn vị tổ chức phối hợp nhanh hơn và giảm rủi ro những chi tiết quan trọng bị bỏ sót ở sát ngày đi.',
      ],
    },
    en: {
      heading: 'Keep the group objective behind every decision',
      paragraphs: [
        'A MICE journey is more than rooms, transfers, and restaurants. If the goal is connection, training, appreciation, or partner meetings, it should shape the rhythm, spaces, and timing. Shared clarity makes operational choices more consistent.',
        'Use a short decision sheet that names budget approval, guest-list confirmation, and change handling. It helps the organiser coordinate quickly and reduces the chance that important details are missed close to departure.',
      ],
    },
  },
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': {
    vi: {
      heading: 'Bắt đầu đúng không có nghĩa là phải biết hết từ đầu',
      paragraphs: [
        'Nhiều người chỉ có một mong muốn ban đầu: muốn đi vào một thời điểm nào đó, cần một chuyến cho gia đình, hoặc phải giải quyết một chặng sân bay. Như vậy đã đủ để bắt đầu. Một cuộc trao đổi tốt sẽ biến thông tin ban đầu thành vài câu hỏi rõ ràng hơn, thay vì yêu cầu bạn chuẩn bị một brief hoàn hảo.',
        'Nếu có nhiều nhu cầu cùng lúc, hãy nói chúng theo thứ tự ưu tiên. Đội ngũ có thể điều phối cuộc trao đổi, nhưng chỉ bạn mới biết điều nào không thể đánh đổi. Cách làm này giúp đề xuất sau đó gọn hơn và sát với quyết định thực tế.',
      ],
    },
    en: {
      heading: 'Starting well does not mean knowing everything first',
      paragraphs: [
        'Many people begin with only one idea: travel in a certain period, plan something for family, or solve an airport stage. That is enough. A useful conversation turns the starting point into clearer questions instead of demanding a perfect brief.',
        'When several needs exist at once, share them in priority order. A team can coordinate the conversation, but only you know what cannot be compromised. This makes the next proposal clearer and closer to a real decision.',
      ],
    },
  },
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': {
    vi: {
      heading: 'Chọn điểm chạm để tiết kiệm thời gian, không để bị giới hạn',
      paragraphs: [
        'Mỗi site được thiết kế để một loại câu hỏi có nơi bắt đầu rõ hơn. Khi bạn đã biết mình cần tour theo lịch, hành trình riêng, hỗ trợ sân bay hay tư vấn tổng thể, đi đúng điểm chạm giúp tránh một vòng trao đổi quá rộng và nhận được thông tin sát hơn.',
        'Tuy vậy, nhu cầu du lịch hiếm khi chỉ thuộc một ô. Bạn có thể bắt đầu ở một site rồi được kết nối tới chuyên môn khác khi hành trình phát sinh thêm yêu cầu. Điều quan trọng là thông tin ban đầu được giữ liền mạch, không phải bạn phải lặp lại câu chuyện nhiều lần.',
      ],
    },
    en: {
      heading: 'Use the right starting point to save time, not to be limited',
      paragraphs: [
        'Each site gives a clearer home to a different kind of question. When you know you need a scheduled tour, a private journey, airport assistance, or broad advice, the right starting point avoids a wide first conversation and produces more relevant information.',
        'Travel needs rarely fit into one box. You can begin on one site and be connected to another specialty as the journey develops. The important part is keeping the original context intact rather than repeating your story.',
      ],
    },
  },
  'he-sinh-thai-wingsgroup-la-gi': {
    vi: {
      heading: 'Một hệ sinh thái chỉ có ích khi trải nghiệm của bạn liền mạch',
      paragraphs: [
        'Với người đọc, hệ sinh thái không nên là một sơ đồ thương hiệu khó nhớ. Giá trị thực là biết mình đang nói chuyện với ai, bước tiếp theo là gì và khi nhu cầu thay đổi thì ai có thể hỗ trợ. Vì thế, một yêu cầu tốt cần được ghi nhận đủ rõ để không bị đứt mạch khi chuyển sang nhóm phù hợp.',
        'Bạn không cần học thuộc từng tên dịch vụ. Hãy bắt đầu bằng hoàn cảnh của mình và những điều quan trọng nhất: thời gian, người đi cùng, mức linh hoạt và điều muốn ưu tiên. Từ đó, đội ngũ có thể đề xuất một lộ trình trao đổi gọn, có trách nhiệm và dễ theo dõi.',
      ],
    },
    en: {
      heading: 'An ecosystem matters only when your experience stays connected',
      paragraphs: [
        'For a reader, an ecosystem should not be a difficult brand diagram. Its real value is knowing who you are speaking with, what happens next, and who can help when needs change. A clear enquiry keeps that context from being lost when a specialist team joins in.',
        'You do not need to memorise every service name. Start with your situation and the essentials: timing, companions, flexibility, and priorities. From there, the team can suggest a concise, accountable conversation path that is easy to follow.',
      ],
    },
  },
}

const editorialExamples: Record<string, Record<'vi' | 'en', Section>> = {
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': {
    vi: {
      heading: 'Ví dụ về một lần kiểm tra có trách nhiệm',
      paragraphs: [
        'Giả sử bạn nhận một chương trình qua tin nhắn và được đề nghị chuyển cọc trong ngày. Thay vì chỉ hỏi “giá đã gồm gì”, hãy xin tên pháp nhân, báo giá có ngày hiệu lực, điều kiện hoàn đổi và tài khoản nhận tiền. Sau đó lưu câu trả lời cùng một bản xác nhận. Nếu bên cung cấp không thể trả lời những câu hỏi cơ bản đó, bạn đã có đủ tín hiệu để tạm dừng và tìm thêm thông tin.',
        'Một quyết định an toàn không có nghĩa là loại bỏ mọi rủi ro. Nó có nghĩa là bạn biết rủi ro nằm ở đâu, ai chịu trách nhiệm và tài liệu nào làm căn cứ khi cần xử lý. Đây cũng là cách tôn trọng công sức của người tư vấn và của chính bạn.',
      ],
    },
    en: {
      heading: 'What a responsible verification looks like',
      paragraphs: [
        'Imagine receiving an itinerary by message with a request to pay a deposit the same day. Instead of asking only what the price includes, ask for the legal entity, proposal validity, change and refund terms, and receiving account. Keep the answers with the final confirmation. If basic questions cannot be answered, you have a clear reason to pause and investigate further.',
        'A safer decision does not remove every risk. It shows where the risk sits, who is accountable, and which document becomes the reference if something needs resolving. That also respects the work of the adviser and your own time.',
      ],
    },
  },
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': {
    vi: {
      heading: 'Đọc checklist theo thứ tự ưu tiên',
      paragraphs: [
        'Không phải mục nào trong checklist cũng quan trọng như nhau. Ngày đi, tên khách, phạm vi dịch vụ và điều kiện thay đổi thường cần được kiểm tra trước; các lựa chọn phụ có thể chốt sau nếu còn thời gian. Sắp xếp như vậy giúp bạn không bị quá tải bởi quá nhiều ô cần đánh dấu.',
        'Sau khi kiểm tra, hãy viết lại ba điểm đã thống nhất bằng ngôn ngữ của mình. Nếu người đặt và người sử dụng là hai người khác nhau, bản tóm tắt này giúp thông tin không bị thất lạc giữa lúc bàn giao.',
      ],
    },
    en: {
      heading: 'Read the checklist in priority order',
      paragraphs: [
        'Not every checklist item carries the same weight. Travel dates, traveller names, service scope, and change terms usually come first; optional preferences can be settled later if time is limited. Prioritising keeps preparation from becoming an overwhelming list of boxes.',
        'After the review, restate the three agreed points in your own words. When the person booking is not the person travelling, this short summary helps the important information survive the handover.',
      ],
    },
  },
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': {
    vi: {
      heading: 'Một đề xuất tốt cho phép bạn hình dung ngày đi',
      paragraphs: [
        'Hãy thử đọc đề xuất như đang sống trong một ngày cụ thể: thức dậy lúc nào, di chuyển bao lâu, lúc nào có thể nghỉ và ai sẽ xuất hiện khi bạn cần hỗ trợ. Nếu mọi chi tiết đều chỉ được mô tả bằng tính từ như “đẳng cấp” hoặc “độc quyền”, hãy hỏi lại bằng những điều có thể kiểm chứng.',
        'Bạn cũng nên nói rõ điều gì khiến nhóm thấy thoải mái. Có người cần nhiều khoảng riêng, có người muốn gặp người địa phương hoặc ưu tiên bữa ăn nhẹ. Những sở thích nhỏ này là vật liệu để cá nhân hóa, không phải yêu cầu phiền phức.',
      ],
    },
    en: {
      heading: 'A good proposal lets you picture the day',
      paragraphs: [
        'Read the proposal as if you were living one particular day: when you wake, how long you transfer, where you can pause, and who appears when support is needed. If every detail is described only with words such as premium or exclusive, ask for specifics you can actually evaluate.',
        'Also explain what comfort means to your group. Some travellers need more private time; others want local encounters or lighter meals. These small preferences are the material of personalisation, not an inconvenience.',
      ],
    },
  },
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': {
    vi: {
      heading: 'Từ mong muốn chung đến một tuyến đi có lý do',
      paragraphs: [
        '“Muốn thấy Việt Nam thật” là một khởi đầu đẹp nhưng chưa đủ để tạo lịch trình. Hãy thử thêm một vài nét: bạn thích thành phố hay thiên nhiên, muốn chủ động hay có người dẫn đường, và có chặng nào muốn ở lâu hơn. Những câu trả lời này biến cảm hứng thành tiêu chí thiết kế.',
        'Khi xem bản nháp, đừng chỉ đếm số điểm đến. Hãy hỏi mỗi chặng đóng góp gì cho câu chuyện của chuyến đi và liệu thời gian di chuyển có làm mất đi trải nghiệm chính hay không. Một tuyến vừa sức thường để lại nhiều ký ức hơn một tuyến kín lịch.',
      ],
    },
    en: {
      heading: 'Turn a broad wish into a route with purpose',
      paragraphs: [
        '“I want to experience the real Vietnam” is a good beginning but not yet an itinerary. Add a little texture: city or nature, independence or a guide, and which stop deserves more time. These answers turn inspiration into design criteria.',
        'When reviewing a draft, do not only count destinations. Ask what each stage contributes to the story and whether transfers take time away from the main experience. A route with breathing room often creates stronger memories than a packed one.',
      ],
    },
  },
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': {
    vi: {
      heading: 'Đặt lựa chọn trong lịch thật của bạn',
      paragraphs: [
        'Một nhóm có bốn ngày nghỉ, người lớn tuổi và mong muốn ăn uống thong thả sẽ cần cách chọn khác một nhóm trẻ muốn khám phá nhiều khu phố. Hãy nói rõ bối cảnh này ngay từ đầu để tư vấn không phải dùng một chương trình “trung bình” cho tất cả mọi người.',
        'Sau khi thu hẹp hai hoặc ba lựa chọn, so sánh các chi tiết khó nhìn thấy trên banner: thời gian di chuyển, số lần đổi chỗ ở, khoảng tự do và mức hỗ trợ khi giấy tờ phát sinh. Đây là những yếu tố thường quyết định cảm nhận sau cùng.',
      ],
    },
    en: {
      heading: 'Place the choice inside your real calendar',
      paragraphs: [
        'A group with four days, older travellers, and a wish for relaxed meals needs a different choice from a younger group that wants to explore many neighbourhoods. Share that context early so an adviser does not have to use an average programme for everyone.',
        'Once two or three options remain, compare what a banner hides: transfer time, hotel changes, free periods, and support if documents become an issue. Those details often shape the final feeling of a trip.',
      ],
    },
  },
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': {
    vi: {
      heading: 'Tách rõ bảo hiểm và dịch vụ hỗ trợ',
      paragraphs: [
        'Bảo hiểm là sản phẩm có điều khoản và quy trình yêu cầu riêng; care support là cách bạn nhận được hướng dẫn hoặc hỗ trợ trong hành trình. Hai khái niệm có thể đi cùng nhau nhưng không thay thế nhau. Khi hỏi, hãy đề nghị giải thích ai cung cấp quyền lợi, ai tiếp nhận cuộc gọi và giấy tờ nào cần giữ.',
        'Trong tình huống khẩn cấp, ưu tiên an toàn và hướng dẫn của cơ quan chức năng tại chỗ. Sau đó liên hệ đúng số trong hợp đồng hoặc xác nhận dịch vụ. Ghi lại thời gian, người đã trao đổi và các khoản phát sinh để việc xử lý sau đó có căn cứ.',
      ],
    },
    en: {
      heading: 'Separate insurance from assistance',
      paragraphs: [
        'Insurance is a product with its own wording and claims process; care support is how guidance or help reaches you during a journey. They may sit together but they are not interchangeable. Ask who provides the benefit, who takes the call, and which records must be kept.',
        'In an emergency, put safety and local authority instructions first. Then use the number in the policy or service confirmation. Record the time, person spoken to, and expenses so a later review has a clear basis.',
      ],
    },
  },
  'fast-track-airport-services-khi-nao-nen-su-dung': {
    vi: {
      heading: 'Kiểm tra kỳ vọng trước khi mua fast-track',
      paragraphs: [
        'Fast-track không làm sân bay biến mất và không miễn các yêu cầu an ninh, hộ chiếu hoặc nhập cảnh. Dịch vụ chỉ có giá trị khi phạm vi hỗ trợ phù hợp với nhà ga, chiều bay và thời điểm. Hỏi rõ điểm gặp, người đón và phần việc bạn vẫn cần tự thực hiện.',
        'Nếu nhóm có trẻ nhỏ, người lớn tuổi hoặc hành lý đặc biệt, hãy nêu từ đầu. Đội ngũ có thể kiểm tra phương án phù hợp hơn, đồng thời nói thẳng nếu sân bay đó không cung cấp một phần hỗ trợ bạn mong đợi.',
      ],
    },
    en: {
      heading: 'Check expectations before buying fast-track',
      paragraphs: [
        'Fast-track does not make an airport disappear and does not waive security, passport, or immigration requirements. It is useful only when the scope fits the terminal, flight direction, and timing. Ask where to meet, who will greet you, and what you still need to do yourself.',
        'If the party includes children, older travellers, or unusual baggage, say so early. The team can check a better fit and be clear if that airport cannot provide part of the support you expected.',
      ],
    },
  },
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': {
    vi: {
      heading: 'Đo lường thành công của chuyến đi đoàn',
      paragraphs: [
        'Một chương trình đoàn nên có cách biết mình đã đạt mục tiêu chưa. Với chuyến tri ân, đó có thể là thời gian kết nối đủ chất lượng; với hội họp, đó có thể là phòng họp phù hợp và lịch không làm người tham dự kiệt sức. Viết mục tiêu thành vài tiêu chí giúp đội tổ chức lựa chọn có căn cứ.',
        'Sau mỗi mốc quan trọng, nên có một người tổng hợp thay đổi và gửi lại bản xác nhận. Quy trình đơn giản này đặc biệt hữu ích khi danh sách khách, chuyến bay hoặc yêu cầu phòng thay đổi nhiều lần.',
      ],
    },
    en: {
      heading: 'Measure whether the group journey worked',
      paragraphs: [
        'A group programme needs a way to know whether it met its purpose. For an incentive trip, that may be quality connection time; for meetings, it may be a suitable room and a schedule that does not exhaust attendees. Turning the goal into a few criteria keeps decisions grounded.',
        'After each important milestone, one person should consolidate changes and resend the confirmation. This simple habit matters when guest lists, flights, or room requests change several times.',
      ],
    },
  },
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': {
    vi: {
      heading: 'Một cuộc trao đổi đầu tiên nên kết thúc bằng gì?',
      paragraphs: [
        'Sau cuộc trao đổi, bạn nên biết bước tiếp theo, người phụ trách và thông tin nào còn thiếu. Đó có thể là một đề xuất sơ bộ, một đường dẫn tới đội ngũ chuyên môn hoặc một danh sách câu hỏi cần trả lời thêm. Nếu chưa rõ ba điểm này, hãy hỏi lại trước khi kết thúc cuộc gọi.',
        'Cách làm này giúp bạn giữ quyền chủ động. Bạn không phải cam kết ngay chỉ vì đã bắt đầu nói chuyện; bạn chỉ đang thu thập đủ thông tin để quyết định một cách bình tĩnh.',
      ],
    },
    en: {
      heading: 'What should the first conversation clarify?',
      paragraphs: [
        'By the end, you should know the next step, the responsible person, and what information is still missing. That may be a first proposal, a referral to a specialist, or a short list of questions to answer. If those three points are unclear, ask before closing the conversation.',
        'This keeps you in control. Starting a conversation does not commit you to a purchase; it gives you enough information to decide calmly.',
      ],
    },
  },
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': {
    vi: {
      heading: 'Không cần chọn đúng ngay từ lần đầu',
      paragraphs: [
        'Một nhu cầu có thể bắt đầu ở WingsGo để xem lịch, sau đó chuyển sang WingSide khi nhận ra nhóm muốn một tuyến riêng. Một gia đình cũng có thể cần vừa thiết kế hành trình vừa hỏi hỗ trợ sân bay. Điều phối tốt nghĩa là giữ nguyên bối cảnh ban đầu khi chuyển đúng chuyên môn.',
        'Khi được giới thiệu sang site khác, hãy kiểm tra xem thông tin nào đã được bàn giao và thông tin nào cần bổ sung. Bạn không nên phải kể lại toàn bộ câu chuyện nếu chỉ thay đổi một phần của hành trình.',
      ],
    },
    en: {
      heading: 'You do not have to choose perfectly first time',
      paragraphs: [
        'A need may begin on WingsGo to explore dates and then move to WingSide when the group realises it wants a private route. A family may also need journey design and airport support together. Good coordination keeps the original context intact as the right specialist joins.',
        'When you are referred to another site, check what has been handed over and what still needs adding. You should not have to retell the entire story when only one part of the journey has changed.',
      ],
    },
  },
  'he-sinh-thai-wingsgroup-la-gi': {
    vi: {
      heading: 'Nhìn hệ sinh thái từ trải nghiệm của bạn',
      paragraphs: [
        'Một hệ sinh thái tốt không buộc khách hàng hiểu sơ đồ tổ chức trước khi nhận hỗ trợ. Nó bắt đầu từ một câu hỏi đơn giản, rồi đưa bạn đến người có khả năng trả lời sâu hơn. Vì vậy, chất lượng kết nối và việc giữ đúng ngữ cảnh quan trọng không kém số lượng site hay dịch vụ được liệt kê.',
        'Khi nhu cầu đã rõ, hãy thống nhất cách cập nhật: email, điện thoại hoặc một đầu mối duy nhất. Một kênh giao tiếp nhất quán giúp quyết định, thay đổi và các mốc cần xác nhận được lưu lại rõ ràng trong suốt hành trình.',
      ],
    },
    en: {
      heading: 'See the ecosystem through your experience',
      paragraphs: [
        'A useful ecosystem does not require guests to understand an organisation chart before receiving help. It starts with a simple question and takes you to the person who can answer it in depth. Connection quality and preserved context matter as much as the number of sites or services listed.',
        'Once the need is clear, agree how updates will be shared: email, phone, or one accountable contact. A consistent channel keeps decisions, changes, and confirmations clear throughout the journey.',
      ],
    },
  },
}

const editorialReaderPlaybook: Record<string, Record<'vi' | 'en', Section>> = {
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': {
    vi: {
      heading: 'Biến thông tin thành bằng chứng dễ kiểm tra',
      paragraphs: [
        'Bạn có thể lưu một thư mục nhỏ cho chuyến đi gồm báo giá, xác nhận dịch vụ, điều khoản và trao đổi quan trọng. Khi có thay đổi, hãy ghi ngày cập nhật và yêu cầu bên tư vấn gửi lại bản cuối. Cách lưu này giúp cả gia đình hoặc người phụ trách tài chính nhìn cùng một thông tin.',
        'Nếu cần so sánh hai đơn vị, hãy đặt cùng một bộ câu hỏi và xem cách họ trả lời, không chỉ xem tốc độ báo giá. Một đối tác đáng tin thường nói rõ phần mình chịu trách nhiệm, phần phụ thuộc nhà cung cấp và cách liên hệ khi có sự cố.',
      ],
    },
    en: {
      heading: 'Turn information into evidence you can check',
      paragraphs: [
        'Keep a small trip folder with the proposal, booking confirmation, terms, and important messages. When something changes, note the date and ask for an updated final version. This helps family members or the person handling payment work from the same reference.',
        'When comparing two providers, give both the same questions and assess the quality of their answers, not only the speed of the quote. A trustworthy partner explains what it controls, what depends on suppliers, and how to reach help if something goes wrong.',
      ],
    },
  },
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': {
    vi: {
      heading: 'Từ checklist đến một bản xác nhận rõ ràng',
      paragraphs: [
        'Checklist hữu ích nhất khi kết thúc bằng một bản tóm tắt ngắn: ai đi, đi ngày nào, dùng dịch vụ nào, tổng ngân sách dự kiến và điều kiện thay đổi. Hãy đọc bản tóm tắt thành tiếng nếu đặt cho nhiều người; một chi tiết nhỏ sai tên hoặc sai ngày có thể kéo theo nhiều việc phải sửa.',
        'Đừng chờ tới sát giờ khởi hành mới kiểm tra lại. Chọn một mốc trước chuyến đi để rà soát hộ chiếu, thanh toán, điểm đón và số điện thoại hỗ trợ. Nếu có mục chưa chắc, đánh dấu để hỏi thay vì tự đoán.',
      ],
    },
    en: {
      heading: 'Turn the checklist into a clear confirmation',
      paragraphs: [
        'A checklist is most useful when it ends in a short summary: who is travelling, on which dates, which services are included, the expected budget, and the change terms. Read it aloud when booking for several people; one wrong name or date can create a chain of corrections.',
        'Do not leave the review until departure is close. Set a checkpoint to confirm passports, payment, meeting points, and the support number. If an item is uncertain, mark it for a question rather than filling the gap with an assumption.',
      ],
    },
  },
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': {
    vi: {
      heading: 'Một hành trình riêng cần nguyên tắc, không chỉ cảm hứng',
      paragraphs: [
        'Hãy xác định một vài điều không thể thỏa hiệp trước khi chọn những chi tiết cao cấp: nhịp di chuyển, không gian riêng, chất lượng giấc ngủ hoặc thời gian cho gia đình. Khi ưu tiên đã rõ, ngân sách được dùng vào đúng khoảnh khắc thay vì dàn đều cho những điểm ít quan trọng.',
        'Bạn cũng có thể yêu cầu một phương án dự phòng cho thời tiết hoặc sức khỏe. Private journey tốt không hứa rằng mọi thứ sẽ hoàn hảo; nó chuẩn bị đủ linh hoạt để trải nghiệm vẫn có ý nghĩa khi kế hoạch cần thay đổi.',
      ],
    },
    en: {
      heading: 'A private journey needs principles, not only inspiration',
      paragraphs: [
        'Decide what cannot be compromised before choosing premium details: travel rhythm, privacy, sleep quality, or family time. Once priorities are clear, the budget goes to the moments that matter instead of being spread across low-impact upgrades.',
        'Ask for a backup option for weather or health as well. A strong private journey does not promise perfect conditions; it builds enough flexibility for the experience to remain meaningful when the plan has to change.',
      ],
    },
  },
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': {
    vi: {
      heading: 'Thiết kế nhịp điệu để Việt Nam được cảm nhận trọn vẹn',
      paragraphs: [
        'Một hành trình inbound có thể bắt đầu bằng những biểu tượng quen thuộc, nhưng dấu ấn thường đến từ cách sắp xếp thời gian. Một buổi sáng chậm, một bữa ăn vừa đủ và khoảng trống để trò chuyện với người địa phương giúp điểm đến trở thành ký ức, thay vì danh sách đã hoàn thành.',
        'Khi trao đổi với người thiết kế tour, hãy kể cả điều bạn không muốn. Không phải ai cũng thích lịch dày, di chuyển đêm hoặc trải nghiệm đông người. Biết giới hạn sớm giúp đội ngũ chọn tuyến, nhịp và người đồng hành phù hợp hơn.',
      ],
    },
    en: {
      heading: 'Design the rhythm so Vietnam can be felt',
      paragraphs: [
        'An inbound journey may begin with familiar icons, but its character often comes from the way time is arranged. A slow morning, an unhurried meal, and room to speak with local people can turn a destination into a memory rather than a completed list.',
        'Tell the trip designer what you do not want as well. Not everyone enjoys dense schedules, overnight transfers, or crowded attractions. Knowing those boundaries early helps the team choose a better route, pace, and set of local partners.',
      ],
    },
  },
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': {
    vi: {
      heading: 'So sánh lựa chọn bằng tiêu chí của nhóm bạn',
      paragraphs: [
        'Bạn có thể chấm mỗi line theo bốn tiêu chí: thời gian thực sự ở điểm đến, mức dễ chịu của việc di chuyển, trải nghiệm phù hợp với độ tuổi và khả năng đổi lịch. Một bảng so sánh đơn giản thường giúp cả nhóm nói về cùng một điều, thay vì tranh luận dựa trên những tấm ảnh đẹp.',
        'Nếu nhóm còn phân vân, hãy chọn một ưu tiên chính cho chuyến này và để dành các ưu tiên khác cho lần sau. Quyết định có chủ ý luôn dễ chịu hơn việc cố nhồi mọi mong muốn vào một lịch trình ngắn.',
      ],
    },
    en: {
      heading: 'Compare options against your group’s real criteria',
      paragraphs: [
        'Score each line on four practical points: time actually spent at the destination, the comfort of transfers, fit for the group’s ages, and flexibility if plans change. A simple comparison table keeps the conversation grounded instead of letting attractive images make the decision.',
        'If the group is still split, choose one primary priority for this trip and save the others for later. An intentional decision is more enjoyable than trying to force every wish into a short itinerary.',
      ],
    },
  },
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': {
    vi: {
      heading: 'Chuẩn bị hồ sơ để được hỗ trợ đúng lúc',
      paragraphs: [
        'Trước ngày đi, hãy chụp hoặc lưu ngoại tuyến số hợp đồng, số hỗ trợ, thông tin người được bảo hiểm và các giới hạn quan trọng. Nếu đi cùng người thân, thống nhất ai giữ bản chính và ai là người liên hệ đầu tiên khi có việc phát sinh.',
        'Sau một sự cố, ghi lại diễn biến theo thứ tự thời gian khi thông tin còn mới. Hóa đơn, giấy xác nhận và trao đổi với cơ sở y tế hoặc nhà cung cấp sẽ giúp đội ngũ hỗ trợ hiểu tình huống nhanh hơn, nhưng không thay thế việc đọc điều khoản từ đầu.',
      ],
    },
    en: {
      heading: 'Prepare records so help can arrive clearly',
      paragraphs: [
        'Before departure, save the policy number, assistance contact, insured traveller details, and key limits offline. If you travel with family, agree who keeps the originals and who makes the first call when something happens.',
        'After an incident, record the timeline while the details are fresh. Receipts, certificates, and messages with a clinic or supplier help an assistance team understand the case quickly, but they do not replace reading the policy wording beforehand.',
      ],
    },
  },
  'fast-track-airport-services-khi-nao-nen-su-dung': {
    vi: {
      heading: 'Để hỗ trợ sân bay thật sự làm chuyến đi nhẹ hơn',
      paragraphs: [
        'Giá trị của fast-track thường nằm ở việc giảm bối rối trong một thời điểm nhiều áp lực. Vì vậy hãy xem dịch vụ có người hướng dẫn tới đúng quầy, có hỗ trợ khi nối chuyến và có phù hợp với giờ cao điểm hay không. Một lời hứa chung chung không giúp bạn chuẩn bị tốt hơn.',
        'Hãy chia sẻ kỳ vọng thực tế với cả gia đình trước khi tới sân bay. Khi mọi người biết phần nào được hỗ trợ và phần nào vẫn tự thực hiện, trải nghiệm sẽ bình tĩnh hơn và nhân viên cũng có thể tập trung vào những điểm cần ưu tiên.',
      ],
    },
    en: {
      heading: 'Make airport assistance genuinely useful',
      paragraphs: [
        'Fast-track is valuable when it removes confusion at a high-pressure moment. Check whether the service guides you to the right counter, supports a connection, and fits the busy period you are travelling in. A broad promise does not give you a better preparation plan.',
        'Set realistic expectations with the whole party before reaching the airport. When everyone knows what is covered and what remains their responsibility, the experience is calmer and the staff can focus on the details that need attention.',
      ],
    },
  },
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': {
    vi: {
      heading: 'Vận hành chuyến đi đoàn bằng những mốc nhỏ',
      paragraphs: [
        'Một chương trình lớn trở nên dễ quản lý hơn khi được chia thành các mốc có người chịu trách nhiệm: chốt danh sách, xác nhận phòng, kiểm tra vận chuyển, duyệt nội dung sự kiện và tổng kết sau chuyến đi. Mỗi mốc nên có hạn cuối và một kênh cập nhật duy nhất.',
        'Đừng chỉ đo thành công bằng việc không có sự cố. Hãy hỏi người tham dự họ có đủ thời gian nghỉ, có hiểu lịch và có cảm thấy được chăm sóc không. Phản hồi này giúp chương trình sau gần hơn với mục tiêu của doanh nghiệp.',
      ],
    },
    en: {
      heading: 'Run a group journey through small milestones',
      paragraphs: [
        'A large programme is easier to manage when it has named milestones: final guest list, room confirmation, transport checks, event approval, and post-trip review. Each milestone needs an owner, a deadline, and one channel where the latest update is kept.',
        'Do not measure success only by the absence of incidents. Ask whether attendees had enough rest, understood the schedule, and felt cared for. That feedback makes the next programme more useful to the organisation’s real goal.',
      ],
    },
  },
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': {
    vi: {
      heading: 'Tóm tắt nhu cầu để được dẫn tới đúng đội ngũ',
      paragraphs: [
        'Một tin nhắn mở đầu tốt không cần dài. Chỉ cần nói bạn đang đi đâu hoặc muốn giải quyết việc gì, thời gian dự kiến, số người và điều khiến bạn băn khoăn nhất. Đội ngũ tiếp nhận sẽ hiểu bối cảnh nhanh hơn và tránh gửi cho bạn một danh sách dịch vụ không liên quan.',
        'Nếu nhu cầu thay đổi trong lúc trao đổi, hãy nói thẳng thay vì tiếp tục theo hướng cũ. Việc chuyển sang site hoặc chuyên môn khác là một phần bình thường của hành trình tư vấn, miễn là thông tin quan trọng được bàn giao rõ ràng.',
      ],
    },
    en: {
      heading: 'Summarise your need to reach the right team',
      paragraphs: [
        'A useful first message does not need to be long. Say where you want to go or what you need solved, the likely timing, the number of travellers, and the concern that matters most. The receiving team can then understand the context without sending an unrelated catalogue of services.',
        'If the need changes during the conversation, say so rather than continuing down the old path. Moving to another site or specialist is a normal part of good consultation when the important context is handed over clearly.',
      ],
    },
  },
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': {
    vi: {
      heading: 'Khi nhu cầu đổi hướng, trải nghiệm không nên bị đứt đoạn',
      paragraphs: [
        'Bạn có thể bắt đầu bằng một site vì câu hỏi ban đầu, rồi nhận ra mình cần một chuyên môn khác. Hãy giữ lại mục tiêu, thời gian và giới hạn ngân sách đã nói từ trước; đó là phần bối cảnh giúp đội ngũ mới tiếp tục công việc mà không bắt bạn làm lại từ đầu.',
        'Một hệ thống nhiều site chỉ tạo ra giá trị khi cách chuyển tiếp rõ ràng. Bạn nên biết ai đang phụ trách, bước tiếp theo là gì và khi nào nhận được phản hồi. Những điểm đơn giản này tạo cảm giác được đồng hành thay vì bị chuyển qua lại.',
      ],
    },
    en: {
      heading: 'When the need changes, the experience should stay connected',
      paragraphs: [
        'You may start with one site because of the first question and then discover that another specialist fits better. Keep the original goal, timing, and budget boundaries in the handover; that context lets the new team continue without asking you to start over.',
        'A multi-site system creates value only when the transition is clear. You should know who owns the next step, what will happen, and when to expect an answer. Those simple signals feel like support rather than being passed around.',
      ],
    },
  },
  'he-sinh-thai-wingsgroup-la-gi': {
    vi: {
      heading: 'Hệ sinh thái tốt bắt đầu từ một câu hỏi đúng',
      paragraphs: [
        'Bạn không cần học thuộc sơ đồ thương hiệu trước khi liên hệ. Hãy bắt đầu bằng câu hỏi thật của mình: tôi cần thiết kế, đặt dịch vụ, hỗ trợ trong chuyến đi hay tổ chức cho một nhóm? Câu hỏi càng cụ thể, đường đi tới người phù hợp càng ngắn.',
        'Trong quá trình đó, hãy yêu cầu cách phối hợp được nói bằng ngôn ngữ dễ hiểu. Một hệ sinh thái lấy người đọc làm trung tâm phải giúp bạn biết thông tin đang ở đâu, ai chịu trách nhiệm và cách tiếp tục nếu kế hoạch thay đổi.',
      ],
    },
    en: {
      heading: 'A useful ecosystem starts with the right question',
      paragraphs: [
        'You do not need to memorise a brand diagram before reaching out. Start with the real question: do you need design, booking, support during the trip, or a programme for a group? The more specific the question, the shorter the route to the right person.',
        'Ask for the coordination plan in plain language. A people-first ecosystem should help you know where the information lives, who is accountable, and how to continue if the plan changes.',
      ],
    },
  },
}

const relatedArticleSlugs: Record<string, string[]> = {
  'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich': [
    'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
    'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
    'he-sinh-thai-wingsgroup-la-gi',
  ],
  'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich': [
    'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
    'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
    'travel-insurance-va-care-support-can-hieu-dung-dieu-gi',
  ],
  'xu-huong-du-lich-cao-cap-va-private-journey-2026': [
    'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made',
    '5-site-trong-he-wingsgroup-khac-nhau-ra-sao',
    'he-sinh-thai-wingsgroup-la-gi',
  ],
  'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made': [
    'xu-huong-du-lich-cao-cap-va-private-journey-2026',
    'cach-chon-dung-line-outbound-cho-han-nhat-trung',
    'he-sinh-thai-wingsgroup-la-gi',
  ],
  'cach-chon-dung-line-outbound-cho-han-nhat-trung': [
    'vi-sao-viet-nam-phu-hop-cho-hanh-trinh-inbound-tailor-made',
    'travel-insurance-va-care-support-can-hieu-dung-dieu-gi',
    'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
  ],
  'travel-insurance-va-care-support-can-hieu-dung-dieu-gi': [
    'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
    'fast-track-airport-services-khi-nao-nen-su-dung',
    'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
  ],
  'fast-track-airport-services-khi-nao-nen-su-dung': [
    'travel-insurance-va-care-support-can-hieu-dung-dieu-gi',
    'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
    'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
  ],
  'nang-luc-to-chuc-hanh-trinh-doan-va-mice-cua-vietwings': [
    'xu-huong-du-lich-cao-cap-va-private-journey-2026',
    '5-site-trong-he-wingsgroup-khac-nhau-ra-sao',
    'he-sinh-thai-wingsgroup-la-gi',
  ],
  'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup': [
    'he-sinh-thai-wingsgroup-la-gi',
    '5-site-trong-he-wingsgroup-khac-nhau-ra-sao',
    'nhung-gi-khach-hang-can-kiem-tra-truoc-khi-dat-dich-vu-du-lich',
  ],
  '5-site-trong-he-wingsgroup-khac-nhau-ra-sao': [
    'he-sinh-thai-wingsgroup-la-gi',
    'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
    'xu-huong-du-lich-cao-cap-va-private-journey-2026',
  ],
  'he-sinh-thai-wingsgroup-la-gi': [
    '5-site-trong-he-wingsgroup-khac-nhau-ra-sao',
    'nen-bat-dau-tu-site-nao-trong-he-sinh-thai-wingsgroup',
    'giay-phep-lu-hanh-va-cac-tin-hieu-trust-khi-chon-cong-ty-du-lich',
  ],
}

const asRichText = (
  article: LocalizedArticle,
  supplemental: Section[] = [],
  slug?: string,
  locale: 'vi' | 'en' = 'vi',
) => {
  const sections = [...article.sections, ...supplemental]
  const relatedLinks = (relatedArticleSlugs[slug || ''] || [])
    .map((relatedSlug) => articles.find((candidate) => candidate.slug === relatedSlug))
    .filter((candidate): candidate is Article => Boolean(candidate))
  const linkHeading = locale === 'en' ? 'Related reading' : 'Đọc thêm'
  const linkNodes = relatedLinks.length
    ? [
        {
          type: 'heading',
          tag: 'h2',
          version: 1,
          children: [
            {
              type: 'text',
              version: 1,
              text: linkHeading,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
        },
        ...relatedLinks.map((related) => ({
          type: 'paragraph',
          version: 1,
          children: [
            {
              type: 'link',
              version: 3,
              children: [
                {
                  type: 'text',
                  version: 1,
                  text: related[locale].title,
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                },
              ],
              direction: 'ltr',
              fields: {
                linkType: 'custom',
                newTab: false,
                url: `${locale === 'en' ? '/en' : ''}/tin-tuc/${related.slug}`,
              },
              format: '',
              indent: 0,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
        })),
      ]
    : []

  return {
    root: {
      type: 'root',
      children: [
        ...sections.flatMap((section) => [
          {
            type: 'heading',
            tag: 'h2',
            version: 1,
            children: [
              {
                type: 'text',
                version: 1,
                text: section.heading,
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
          },
          ...section.paragraphs.map((text) => ({
            type: 'paragraph',
            version: 1,
            children: [
              { type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            textFormat: 0,
          })),
        ]),
        ...linkNodes,
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

const argumentValue = (name: string) => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const resolveAdmin = async (payload: Payload, apply: boolean) => {
  if (!apply) return { id: 0, collection: 'users', role: 'super-admin', sites: [] }
  const email = String(
    argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '',
  ).trim()
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: email ? { email: { equals: email } } : { role: { equals: 'super-admin' } },
  })
  if (result.docs.length !== 1 || result.docs[0].role !== 'super-admin')
    throw new Error('Apply requires exactly one super-admin operator')
  return result.docs[0]
}

const resolveEditorialAuthor = async (payload: Payload, siteID: number | string) => {
  const existing = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: editorialAuthorEmail } },
  })
  if (existing.docs.length > 1) throw new Error('Expected at most one editorial author account')
  if (existing.docs.length === 1) return existing.docs[0]

  return payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email: editorialAuthorEmail,
      name: editorialAuthorName,
      password: crypto.randomUUID(),
      role: 'editor',
      sites: [Number(siteID)],
    },
  })
}

const assertProductionWriteTarget = () => {
  const databaseUrl = process.env.DATABASE_URL || ''
  if (process.env.NODE_ENV !== 'production')
    throw new Error('Production write requires NODE_ENV=production')
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl))
    throw new Error('Production write requires a PostgreSQL DATABASE_URL')
  if (process.env.PAYLOAD_DB_PUSH !== 'false')
    throw new Error('Production write requires PAYLOAD_DB_PUSH=false')
}

const main = async () => {
  const apply = process.argv.includes('--apply')
  if (apply && argumentValue('--confirm') !== applyConfirmation)
    throw new Error(`Apply requires --confirm=${applyConfirmation}`)
  if (apply) assertProductionWriteTarget()
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  const admin = await resolveAdmin(payload, apply)
  const req = await createLocalReq({ user: admin as never }, payload)
  const siteResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: 'wings-group' } },
  })
  if (siteResult.docs.length !== 1)
    throw new Error(`Expected exactly one wings-group site; found ${siteResult.docs.length}`)
  const siteID = siteResult.docs[0].id
  const posts = await Promise.all(
    articles.map(async (article) => ({
      article,
      result: await payload.find({
        collection: 'posts',
        depth: 0,
        locale: 'vi',
        fallbackLocale: false,
        limit: 2,
        overrideAccess: true,
        pagination: false,
        req,
        where: { and: [{ site: { equals: siteID } }, { slug: { equals: article.slug } }] },
      }),
    })),
  )
  const missing = posts
    .filter(({ result }) => result.docs.length !== 1)
    .map(({ article, result }) => `${article.slug}:${result.docs.length}`)
  if (missing.length)
    throw new Error(`Refusing editorial update; post inventory drifted: ${missing.join(', ')}`)
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          phase: 'plan',
          posts: posts.map(({ article, result }) => ({
            id: result.docs[0].id,
            slug: article.slug,
            viTitle: article.vi.title,
            enTitle: article.en.title,
          })),
          media: 'unchanged-pending-ai-hero-assets',
        },
        null,
        2,
      ),
    )
    return
  }
  const publishedAt = new Date().toISOString()
  const editorialAuthor = await resolveEditorialAuthor(payload, siteID)
  for (const { article, result } of posts) {
    const post = result.docs[0]
    for (const locale of ['vi', 'en'] as const) {
      const localized = article[locale]
      const supplemental = [
        ...(editorialDepth[article.slug]?.[locale] || []),
        editorialExpansion[article.slug][locale],
        editorialExamples[article.slug][locale],
        editorialReaderPlaybook[article.slug][locale],
      ]
      await payload.update({
        collection: 'posts',
        id: post.id,
        locale,
        req,
        overrideAccess: true,
        context: { disableRevalidate: true },
        data: {
          _status: 'published',
          authors: [editorialAuthor.id],
          content: asRichText(localized, supplemental, article.slug, locale),
          meta: {
            title: seoTitles[article.slug][locale],
            description: seoDescription(localized.description, locale),
            breadcrumbLabel: localized.title,
          },
          publishedAt,
          title: localized.title,
        } as never,
      })
    }
  }
  for (const locale of ['vi', 'en'] as const) {
    const archivePages = await payload.find({
      collection: 'pages',
      depth: 0,
      locale,
      fallbackLocale: false,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req,
      where: { and: [{ site: { equals: siteID } }, { slug: { equals: 'tin-tuc' } }] },
    })
    if (archivePages.docs.length !== 1)
      throw new Error(
        `Expected one WingsGroup news archive page for ${locale}; found ${archivePages.docs.length}`,
      )
    const archivePage = archivePages.docs[0]
    const layouts = Array.isArray(archivePage.layout) ? archivePage.layout : []
    const archiveBlocks = layouts.filter((block) => block.blockType === 'archive')
    if (archiveBlocks.length !== 1)
      throw new Error(`Expected one archive block on /tin-tuc; found ${archiveBlocks.length}`)
    await payload.update({
      collection: 'pages',
      id: archivePage.id,
      locale,
      req,
      overrideAccess: true,
      context: { disableRevalidate: true },
      data: {
        layout: layouts.map((block) =>
          block.blockType === 'archive' ? { ...block, limit: 11 } : block,
        ),
      } as never,
    })
  }
  console.log(
    JSON.stringify({
      phase: 'apply',
      posts: articles.length,
      archiveLimit: 11,
      publishedAt,
      media: 'unchanged-pending-ai-hero-assets',
    }),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

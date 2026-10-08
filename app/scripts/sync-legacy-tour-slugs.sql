-- Migration: Normalize legacy tour slugs, update wrapper pages, and setup 301 redirects
-- Generated at: 2026-10-08T14:35:09.721Z
-- Executed and verified on PostgreSQL production (wingstravel-postgres-1)

BEGIN;

-- Tour ID 110: TOUR DU LỊCH WINGSGO VIP 1789743755217
-- Old: tour-du-lch-wingsgo-vip-1789743755217
-- New: tour-du-lich-wingsgo-vip-1789743755217
UPDATE tour_products SET slug = 'tour-du-lich-wingsgo-vip-1789743755217', updated_at = NOW() WHERE id = 110;
UPDATE _tour_products_v SET version_slug = 'tour-du-lich-wingsgo-vip-1789743755217', updated_at = NOW() WHERE parent_id = 110;
UPDATE redirects SET to_url = '/tour/tour-du-lich-wingsgo-vip-1789743755217', updated_at = NOW() WHERE to_url = '/tour/tour-du-lch-wingsgo-vip-1789743755217';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/tour-du-lch-wingsgo-vip-1789743755217', 'custom', '/tour/tour-du-lich-wingsgo-vip-1789743755217', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 111: TOUR DU LỊCH WINGSGO VIP
-- Old: tour-du-lch-wingsgo-vip-1789744001298
-- New: tour-du-lich-wingsgo-vip
UPDATE tour_products SET slug = 'tour-du-lich-wingsgo-vip', updated_at = NOW() WHERE id = 111;
UPDATE _tour_products_v SET version_slug = 'tour-du-lich-wingsgo-vip', updated_at = NOW() WHERE parent_id = 111;
UPDATE pages SET slug = 'tour-du-lich-wingsgo-vip', pathname = '/tour/tour-du-lich-wingsgo-vip', updated_at = NOW() WHERE id = 319;
UPDATE _pages_v SET version_slug = 'tour-du-lich-wingsgo-vip', version_pathname = '/tour/tour-du-lich-wingsgo-vip', updated_at = NOW() WHERE parent_id = 319;
UPDATE redirects SET to_url = '/tour/tour-du-lich-wingsgo-vip', updated_at = NOW() WHERE to_url = '/tour/tour-du-lch-wingsgo-vip-1789744001298';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/tour-du-lch-wingsgo-vip-1789744001298', 'custom', '/tour/tour-du-lich-wingsgo-vip', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 112: HÀ NỘI – SEOUL – NAMI – EVERLAND - HÁI TÁO (VJ)
-- Old: hn-seoul-nami-everland-haitao
-- New: ha-noi-seoul-nami-everland-hai-tao-vj
UPDATE tour_products SET slug = 'ha-noi-seoul-nami-everland-hai-tao-vj', updated_at = NOW() WHERE id = 112;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-nami-everland-hai-tao-vj', updated_at = NOW() WHERE parent_id = 112;
UPDATE pages SET slug = 'ha-noi-seoul-nami-everland-hai-tao-vj', pathname = '/tour/ha-noi-seoul-nami-everland-hai-tao-vj', updated_at = NOW() WHERE id = 316;
UPDATE _pages_v SET version_slug = 'ha-noi-seoul-nami-everland-hai-tao-vj', version_pathname = '/tour/ha-noi-seoul-nami-everland-hai-tao-vj', updated_at = NOW() WHERE parent_id = 316;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-nami-everland-hai-tao-vj', updated_at = NOW() WHERE to_url = '/tour/hn-seoul-nami-everland-haitao';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/hn-seoul-nami-everland-haitao', 'custom', '/tour/ha-noi-seoul-nami-everland-hai-tao-vj', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 113: TOUR THƯỢNG HẢI - HÀNG CHÂU - Ô TRẤN VIP 287588
-- Old: tour-thng-hi---hng-chu----trn-vip-287588
-- New: tour-thuong-hai-hang-chau-o-tran-vip-287588
UPDATE tour_products SET slug = 'tour-thuong-hai-hang-chau-o-tran-vip-287588', updated_at = NOW() WHERE id = 113;
UPDATE _tour_products_v SET version_slug = 'tour-thuong-hai-hang-chau-o-tran-vip-287588', updated_at = NOW() WHERE parent_id = 113;
UPDATE pages SET slug = 'tour-thuong-hai-hang-chau-o-tran-vip-287588', pathname = '/tour/tour-thuong-hai-hang-chau-o-tran-vip-287588', updated_at = NOW() WHERE id = 315;
UPDATE _pages_v SET version_slug = 'tour-thuong-hai-hang-chau-o-tran-vip-287588', version_pathname = '/tour/tour-thuong-hai-hang-chau-o-tran-vip-287588', updated_at = NOW() WHERE parent_id = 315;
UPDATE redirects SET to_url = '/tour/tour-thuong-hai-hang-chau-o-tran-vip-287588', updated_at = NOW() WHERE to_url = '/tour/tour-thng-hi---hng-chu----trn-vip-287588';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/tour-thng-hi---hng-chu----trn-vip-287588', 'custom', '/tour/tour-thuong-hai-hang-chau-o-tran-vip-287588', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 117: HÀ NỘI – OSAKA – KOBE – KYOTO – NÚI PHÚ SĨ – TOKYO (VJ)
-- Old: h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo
-- New: ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj
UPDATE tour_products SET slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', updated_at = NOW() WHERE id = 117;
UPDATE _tour_products_v SET version_slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', updated_at = NOW() WHERE parent_id = 117;
UPDATE pages SET slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', pathname = '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', updated_at = NOW() WHERE id = 320;
UPDATE _pages_v SET version_slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', version_pathname = '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', updated_at = NOW() WHERE parent_id = 320;
UPDATE redirects SET to_url = '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', updated_at = NOW() WHERE to_url = '/tour/h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo', 'custom', '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vj', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 118: HÀ NỘI – OSAKA – KOBE – KYOTO – NÚI PHÚ SĨ – TOKYO (VNA)
-- Old: khm-ph-ma-thu-nht-bn-ma-p-nht-trong-nm-h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo
-- New: ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna
UPDATE tour_products SET slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', updated_at = NOW() WHERE id = 118;
UPDATE _tour_products_v SET version_slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', updated_at = NOW() WHERE parent_id = 118;
UPDATE pages SET slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', pathname = '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', updated_at = NOW() WHERE id = 321;
UPDATE _pages_v SET version_slug = 'ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', version_pathname = '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', updated_at = NOW() WHERE parent_id = 321;
UPDATE redirects SET to_url = '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', updated_at = NOW() WHERE to_url = '/tour/khm-ph-ma-thu-nht-bn-ma-p-nht-trong-nm-h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/khm-ph-ma-thu-nht-bn-ma-p-nht-trong-nm-h-ni-osaka-kobe-kyoto-ni-ph-s-tokyo', 'custom', '/tour/ha-noi-osaka-kobe-kyoto-nui-phu-si-tokyo-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 119: TOUR 6N5Đ: OSAKA - KOBE - KYOTO - NÚI PHÚ SĨ - TOKYO (KIX-NRT) 
-- Old: tour-6n5-osaka-kobe-kyoto-ni-ph-s-tokyo-kix-nrt
-- New: tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt
UPDATE tour_products SET slug = 'tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', updated_at = NOW() WHERE id = 119;
UPDATE _tour_products_v SET version_slug = 'tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', updated_at = NOW() WHERE parent_id = 119;
UPDATE pages SET slug = 'tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', pathname = '/tour/tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', updated_at = NOW() WHERE id = 322;
UPDATE _pages_v SET version_slug = 'tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', version_pathname = '/tour/tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', updated_at = NOW() WHERE parent_id = 322;
UPDATE redirects SET to_url = '/tour/tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', updated_at = NOW() WHERE to_url = '/tour/tour-6n5-osaka-kobe-kyoto-ni-ph-s-tokyo-kix-nrt';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/tour-6n5-osaka-kobe-kyoto-ni-ph-s-tokyo-kix-nrt', 'custom', '/tour/tour-6n5d-osaka-kobe-kyoto-nui-phu-si-tokyo-kix-nrt', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 120: HÀ NỘI – SEOUL – NAMI – EVERLAND –THƯ VIỆN SÁCH- HÁI TÁO- LÀNG CỔ NAMSAN (VNA)
-- Old: h-ni-seoul-nami-everland-th-vin-sch-hi-to-lng-c-namsan
-- New: ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna
UPDATE tour_products SET slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', updated_at = NOW() WHERE id = 120;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', updated_at = NOW() WHERE parent_id = 120;
UPDATE pages SET slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', pathname = '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', updated_at = NOW() WHERE id = 323;
UPDATE _pages_v SET version_slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', version_pathname = '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', updated_at = NOW() WHERE parent_id = 323;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', updated_at = NOW() WHERE to_url = '/tour/h-ni-seoul-nami-everland-th-vin-sch-hi-to-lng-c-namsan';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni-seoul-nami-everland-th-vin-sch-hi-to-lng-c-namsan', 'custom', '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-lang-co-namsan-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 121: HÀ NỘI – SEOUL – NAMI – EVERLAND - THƯ VIỆN SÁCH - HÁI TÁO (7C)
-- Old: h-ni-seoul-nami-everland-th-vin-sch-hi-to-vna
-- New: ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c
UPDATE tour_products SET slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', updated_at = NOW() WHERE id = 121;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', updated_at = NOW() WHERE parent_id = 121;
UPDATE pages SET slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', pathname = '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', updated_at = NOW() WHERE id = 324;
UPDATE _pages_v SET version_slug = 'ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', version_pathname = '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', updated_at = NOW() WHERE parent_id = 324;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', updated_at = NOW() WHERE to_url = '/tour/h-ni-seoul-nami-everland-th-vin-sch-hi-to-vna';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni-seoul-nami-everland-th-vin-sch-hi-to-vna', 'custom', '/tour/ha-noi-seoul-nami-everland-thu-vien-sach-hai-tao-7c', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 122: HÀ NỘI – BUSAN – SEOUL – ĐẢO NAMI – INCHEON- ĐI PHÀ CHO HẢI ÂU ĂN (VJ)
-- Old: h-ni-busan-seoul-o-nami-incheon-i-ph-cho-hi-u-n-vj
-- New: ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj
UPDATE tour_products SET slug = 'ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', updated_at = NOW() WHERE id = 122;
UPDATE _tour_products_v SET version_slug = 'ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', updated_at = NOW() WHERE parent_id = 122;
UPDATE pages SET slug = 'ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', pathname = '/tour/ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', updated_at = NOW() WHERE id = 325;
UPDATE _pages_v SET version_slug = 'ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', version_pathname = '/tour/ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', updated_at = NOW() WHERE parent_id = 325;
UPDATE redirects SET to_url = '/tour/ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', updated_at = NOW() WHERE to_url = '/tour/h-ni-busan-seoul-o-nami-incheon-i-ph-cho-hi-u-n-vj';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni-busan-seoul-o-nami-incheon-i-ph-cho-hi-u-n-vj', 'custom', '/tour/ha-noi-busan-seoul-dao-nami-incheon-di-pha-cho-hai-au-an-vj', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 123:  NAGOYA – KYOTO – LÀNG CỔ SHIRAKAWA-GO – MATSUMOTO – FUJI.MT – TOKYO (VNA)
-- Old: nagoya-kyoto-lng-c-shirakawa-go-matsumoto-fujimt-tokyo-vna
-- New: nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna
UPDATE tour_products SET slug = 'nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', updated_at = NOW() WHERE id = 123;
UPDATE _tour_products_v SET version_slug = 'nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', updated_at = NOW() WHERE parent_id = 123;
UPDATE pages SET slug = 'nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', pathname = '/tour/nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', updated_at = NOW() WHERE id = 326;
UPDATE _pages_v SET version_slug = 'nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', version_pathname = '/tour/nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', updated_at = NOW() WHERE parent_id = 326;
UPDATE redirects SET to_url = '/tour/nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', updated_at = NOW() WHERE to_url = '/tour/nagoya-kyoto-lng-c-shirakawa-go-matsumoto-fujimt-tokyo-vna';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/nagoya-kyoto-lng-c-shirakawa-go-matsumoto-fujimt-tokyo-vna', 'custom', '/tour/nagoya-kyoto-lang-co-shirakawa-go-matsumoto-fuji-mt-tokyo-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 124: HÀ NỘI – BUSAN – GYEONGJU – SEOUL – ĐẢO NAMI – TÀU ĐIỆN VEN BIỂN HAEUNDAE - CỎ HỒNG MUHLY - LÀNG VĂN HÓA HUINNYEOUL (VNA)
-- Old: h-ni-busan-gyeongju-seoul-o-nami-tu-in-ven-bin-haeundae-c-hng-muhly-lng-vn-ha-huinnyeoul
-- New: ha-noi-busan-gyeongju-seoul-dao-nami-tau-dien-ven-bien-haeundae-co-hong-muhly-lang-van-hoa-huinnyeoul-vna
UPDATE tour_products SET slug = 'ha-noi-busan-gyeongju-seoul-dao-nami-tau-dien-ven-bien-haeundae-co-hong-muhly-lang-van-hoa-huinnyeoul-vna', updated_at = NOW() WHERE id = 124;
UPDATE _tour_products_v SET version_slug = 'ha-noi-busan-gyeongju-seoul-dao-nami-tau-dien-ven-bien-haeundae-co-hong-muhly-lang-van-hoa-huinnyeoul-vna', updated_at = NOW() WHERE parent_id = 124;
UPDATE redirects SET to_url = '/tour/ha-noi-busan-gyeongju-seoul-dao-nami-tau-dien-ven-bien-haeundae-co-hong-muhly-lang-van-hoa-huinnyeoul-vna', updated_at = NOW() WHERE to_url = '/tour/h-ni-busan-gyeongju-seoul-o-nami-tu-in-ven-bin-haeundae-c-hng-muhly-lng-vn-ha-huinnyeoul';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni-busan-gyeongju-seoul-o-nami-tu-in-ven-bin-haeundae-c-hng-muhly-lng-vn-ha-huinnyeoul', 'custom', '/tour/ha-noi-busan-gyeongju-seoul-dao-nami-tau-dien-ven-bien-haeundae-co-hong-muhly-lang-van-hoa-huinnyeoul-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 125: HÀ NỘI – SEOUL – JEJU – NAMI – CỎ HỒNG – DU THUYỀN JEJU – SAUNA (7C)
-- Old: h-ni-seoul-jeju-nami-c-hng-du-thuyn-jeju-sauna-7c
-- New: ha-noi-seoul-jeju-nami-co-hong-du-thuyen-jeju-sauna-7c
UPDATE tour_products SET slug = 'ha-noi-seoul-jeju-nami-co-hong-du-thuyen-jeju-sauna-7c', updated_at = NOW() WHERE id = 125;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-jeju-nami-co-hong-du-thuyen-jeju-sauna-7c', updated_at = NOW() WHERE parent_id = 125;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-jeju-nami-co-hong-du-thuyen-jeju-sauna-7c', updated_at = NOW() WHERE to_url = '/tour/h-ni-seoul-jeju-nami-c-hng-du-thuyn-jeju-sauna-7c';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni-seoul-jeju-nami-c-hng-du-thuyn-jeju-sauna-7c', 'custom', '/tour/ha-noi-seoul-jeju-nami-co-hong-du-thuyen-jeju-sauna-7c', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 126: TOKYO – NÚI PHÚ SĨ – NAGOYA – KYOTO – OSAKA  (VNA)
-- Old: tokyo-ni-ph-s-nagoya-kyoto-osaka-vna
-- New: tokyo-nui-phu-si-nagoya-kyoto-osaka-vna
UPDATE tour_products SET slug = 'tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', updated_at = NOW() WHERE id = 126;
UPDATE _tour_products_v SET version_slug = 'tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', updated_at = NOW() WHERE parent_id = 126;
UPDATE pages SET slug = 'tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', pathname = '/tour/tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', updated_at = NOW() WHERE id = 328;
UPDATE _pages_v SET version_slug = 'tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', version_pathname = '/tour/tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', updated_at = NOW() WHERE parent_id = 328;
UPDATE redirects SET to_url = '/tour/tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', updated_at = NOW() WHERE to_url = '/tour/tokyo-ni-ph-s-nagoya-kyoto-osaka-vna';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/tokyo-ni-ph-s-nagoya-kyoto-osaka-vna', 'custom', '/tour/tokyo-nui-phu-si-nagoya-kyoto-osaka-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 127: HÀ NỘI – SEOUL – NAMI – LOTTE WORLD – TRƯỢT TUYẾT –  HÁI DÂU – THƯ VIỆN SÁCH (VNA - Bay trưa về tối)
-- Old: seoul-nami-lotte-world-trt-tuyt-hi-du
-- New: ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi
UPDATE tour_products SET slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', updated_at = NOW() WHERE id = 127;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', updated_at = NOW() WHERE parent_id = 127;
UPDATE pages SET slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', pathname = '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', updated_at = NOW() WHERE id = 331;
UPDATE _pages_v SET version_slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', version_pathname = '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', updated_at = NOW() WHERE parent_id = 331;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', updated_at = NOW() WHERE to_url = '/tour/seoul-nami-lotte-world-trt-tuyt-hi-du';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/seoul-nami-lotte-world-trt-tuyt-hi-du', 'custom', '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-trua-ve-toi', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 128: HOKKAIDO – ASAHIKAWA – SAPPORO– NOBORIBETSU – NGẮM LÁ VÀNG MÙA THU (NH)
-- Old: hokkaido-asahikawa-sapporo-noboribetsu-ngm-l-vng-ma-thu-nh
-- New: hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh
UPDATE tour_products SET slug = 'hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', updated_at = NOW() WHERE id = 128;
UPDATE _tour_products_v SET version_slug = 'hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', updated_at = NOW() WHERE parent_id = 128;
UPDATE pages SET slug = 'hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', pathname = '/tour/hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', updated_at = NOW() WHERE id = 330;
UPDATE _pages_v SET version_slug = 'hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', version_pathname = '/tour/hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', updated_at = NOW() WHERE parent_id = 330;
UPDATE redirects SET to_url = '/tour/hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', updated_at = NOW() WHERE to_url = '/tour/hokkaido-asahikawa-sapporo-noboribetsu-ngm-l-vng-ma-thu-nh';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/hokkaido-asahikawa-sapporo-noboribetsu-ngm-l-vng-ma-thu-nh', 'custom', '/tour/hokkaido-asahikawa-sapporo-noboribetsu-ngam-la-vang-mua-thu-nh', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 129: ĐÓN NĂM MỚI TẠI NHẬT BẢN TOKYO – NÚI PHÚ SĨ – KYOTO – OSAKA – TRƯỢT TUYẾT (VNA)
-- Old: n-nm-mi-ti-nht-bn-tokyo-ni-ph-s-kyoto-osaka-trt-tuyt-vna
-- New: don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna
UPDATE tour_products SET slug = 'don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', updated_at = NOW() WHERE id = 129;
UPDATE _tour_products_v SET version_slug = 'don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', updated_at = NOW() WHERE parent_id = 129;
UPDATE pages SET slug = 'don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', pathname = '/tour/don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', updated_at = NOW() WHERE id = 332;
UPDATE _pages_v SET version_slug = 'don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', version_pathname = '/tour/don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', updated_at = NOW() WHERE parent_id = 332;
UPDATE redirects SET to_url = '/tour/don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', updated_at = NOW() WHERE to_url = '/tour/n-nm-mi-ti-nht-bn-tokyo-ni-ph-s-kyoto-osaka-trt-tuyt-vna';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/n-nm-mi-ti-nht-bn-tokyo-ni-ph-s-kyoto-osaka-trt-tuyt-vna', 'custom', '/tour/don-nam-moi-tai-nhat-ban-tokyo-nui-phu-si-kyoto-osaka-truot-tuyet-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 130: HÀ NỘI – SEOUL – NAMI – LOTTE WORLD – TRƯỢT TUYẾT – HÁI DÂU – THƯ VIỆN SÁCH (VNA - bay tối về tối)
-- Old: h-ni--seoul--nami--lotte-world--trt-tuyt--hi-du--th-vin-sch-vna---bay-ti-v-ti
-- New: ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi
UPDATE tour_products SET slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', updated_at = NOW() WHERE id = 130;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', updated_at = NOW() WHERE parent_id = 130;
UPDATE pages SET slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', pathname = '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', updated_at = NOW() WHERE id = 333;
UPDATE _pages_v SET version_slug = 'ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', version_pathname = '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', updated_at = NOW() WHERE parent_id = 333;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', updated_at = NOW() WHERE to_url = '/tour/h-ni--seoul--nami--lotte-world--trt-tuyt--hi-du--th-vin-sch-vna---bay-ti-v-ti';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni--seoul--nami--lotte-world--trt-tuyt--hi-du--th-vin-sch-vna---bay-ti-v-ti', 'custom', '/tour/ha-noi-seoul-nami-lotte-world-truot-tuyet-hai-dau-thu-vien-sach-vna-bay-toi-ve-toi', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 131: HÀ NỘI – SEOUL – JEJU – TRẢI NGHIỆM SAUNA – TRƯỢT TUYẾT ELYSIAN – HÁI QUÝT (7C)
-- Old: h-ni--seoul--jeju--tri-nghim-sauna--trt-tuyt-elysian--hi-qut-7c
-- New: ha-noi-seoul-jeju-trai-nghiem-sauna-truot-tuyet-elysian-hai-quyt-7c
UPDATE tour_products SET slug = 'ha-noi-seoul-jeju-trai-nghiem-sauna-truot-tuyet-elysian-hai-quyt-7c', updated_at = NOW() WHERE id = 131;
UPDATE _tour_products_v SET version_slug = 'ha-noi-seoul-jeju-trai-nghiem-sauna-truot-tuyet-elysian-hai-quyt-7c', updated_at = NOW() WHERE parent_id = 131;
UPDATE redirects SET to_url = '/tour/ha-noi-seoul-jeju-trai-nghiem-sauna-truot-tuyet-elysian-hai-quyt-7c', updated_at = NOW() WHERE to_url = '/tour/h-ni--seoul--jeju--tri-nghim-sauna--trt-tuyt-elysian--hi-qut-7c';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni--seoul--jeju--tri-nghim-sauna--trt-tuyt-elysian--hi-qut-7c', 'custom', '/tour/ha-noi-seoul-jeju-trai-nghiem-sauna-truot-tuyet-elysian-hai-quyt-7c', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 132: HÀ NỘI – BUSAN – SEOUL – TRƯỢT TUYẾT – INCHEON – TÀU ĐIỆN VEN BIỂN (VJ)
-- Old: h-ni--busan--seoul--trt-tuyt--incheon--tu-in-ven-bin
-- New: ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj
UPDATE tour_products SET slug = 'ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', updated_at = NOW() WHERE id = 132;
UPDATE _tour_products_v SET version_slug = 'ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', updated_at = NOW() WHERE parent_id = 132;
UPDATE pages SET slug = 'ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', pathname = '/tour/ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', updated_at = NOW() WHERE id = 334;
UPDATE _pages_v SET version_slug = 'ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', version_pathname = '/tour/ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', updated_at = NOW() WHERE parent_id = 334;
UPDATE redirects SET to_url = '/tour/ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', updated_at = NOW() WHERE to_url = '/tour/h-ni--busan--seoul--trt-tuyt--incheon--tu-in-ven-bin';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni--busan--seoul--trt-tuyt--incheon--tu-in-ven-bin', 'custom', '/tour/ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 134: HÀ NỘI – BUSAN – GYEONGJU – SEOUL – TÀU ĐIỆN – TRƯỢT TUYẾT ELYSIAN- LÀNG CỔ EUNPYEONG (VNA)
-- Old: h-ni--busan--gyeongju--seoul--tu-in--trt-tuyt-elysian--lng-c-eunpyeong-vna
-- New: ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna
UPDATE tour_products SET slug = 'ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', updated_at = NOW() WHERE id = 134;
UPDATE _tour_products_v SET version_slug = 'ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', updated_at = NOW() WHERE parent_id = 134;
UPDATE pages SET slug = 'ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', pathname = '/tour/ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', updated_at = NOW() WHERE id = 336;
UPDATE _pages_v SET version_slug = 'ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', version_pathname = '/tour/ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', updated_at = NOW() WHERE parent_id = 336;
UPDATE redirects SET to_url = '/tour/ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', updated_at = NOW() WHERE to_url = '/tour/h-ni--busan--gyeongju--seoul--tu-in--trt-tuyt-elysian--lng-c-eunpyeong-vna';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/h-ni--busan--gyeongju--seoul--tu-in--trt-tuyt-elysian--lng-c-eunpyeong-vna', 'custom', '/tour/ha-noi-busan-gyeongju-seoul-tau-dien-truot-tuyet-elysian-lang-co-eunpyeong-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

-- Tour ID 135: ĐÓN TẾT ĐINH MÙI TẠI NHẬT BẢN 2027 NAGOYA – KYOTO – LÀNG CỔ SHIRAKAWAGO – TAKAYAMA – NÚI PHÚ SĨ – TOKYO – NGẮM HOA ANH ĐÀO NỞ SỚM (VNA)
-- Old: n-tt-inh-mi-ti-nht-bn-2027-nagoya--kyoto--lng-c-shirakawago--takayama--ni-ph-s--tokyo--ngm-hoa-anh-o-n-sm-vna
-- New: don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna
UPDATE tour_products SET slug = 'don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', updated_at = NOW() WHERE id = 135;
UPDATE _tour_products_v SET version_slug = 'don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', updated_at = NOW() WHERE parent_id = 135;
UPDATE pages SET slug = 'don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', pathname = '/tour/don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', updated_at = NOW() WHERE id = 337;
UPDATE _pages_v SET version_slug = 'don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', version_pathname = '/tour/don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', updated_at = NOW() WHERE parent_id = 337;
UPDATE redirects SET to_url = '/tour/don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', updated_at = NOW() WHERE to_url = '/tour/n-tt-inh-mi-ti-nht-bn-2027-nagoya--kyoto--lng-c-shirakawago--takayama--ni-ph-s--tokyo--ngm-hoa-anh-o-n-sm-vna';
INSERT INTO redirects ("from", to_type, to_url, type, updated_at, created_at)
VALUES ('/tour/n-tt-inh-mi-ti-nht-bn-2027-nagoya--kyoto--lng-c-shirakawago--takayama--ni-ph-s--tokyo--ngm-hoa-anh-o-n-sm-vna', 'custom', '/tour/don-tet-dinh-mui-tai-nhat-ban-2027-nagoya-kyoto-lang-co-shirakawago-takayama-nui-phu-si-tokyo-ngam-hoa-anh-dao-no-som-vna', '301', NOW(), NOW())
ON CONFLICT ("from") DO UPDATE
SET to_url = EXCLUDED.to_url, type = '301', updated_at = NOW();

COMMIT;

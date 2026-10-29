# US-092 Phase 0 — Date Shape Audit (Local Database)

## 1. Overview & Execution Scope

- **Database Analyzed:** Local SQLite database configured via `app/.env` (`DATABASE_URL=file:./payload-tourplatform.db`).
- **Access Level:** Strictly read-only queries executed locally.
- **Safety Boundary:** No staging, production, VPS, or remote database was accessed. Production run is pending orchestrator approval.
- **Goal:** Audit `tour_departures.departure_date` to detect departures where the Vietnam calendar day (`Asia/Ho_Chi_Minh`, UTC+7) differs from the UTC calendar day, and analyze the distribution of time-of-day values.

---

## 2. Exact Read-Only SQL Executed (SQLite)

### Query 1: Time-of-day distribution
```sql
SELECT
  substr(departure_date, 12, 8) AS time_part,
  count(*) AS count
FROM tour_departures
GROUP BY time_part
ORDER BY count DESC;
```

### Query 2: Discrepancy count per site (VN calendar day vs UTC day)
```sql
SELECT
  s.id AS site_id,
  s.code AS site_code,
  s.name AS site_name,
  count(td.id) AS total_departures,
  sum(CASE WHEN date(td.departure_date) != date(td.departure_date, '+7 hours') THEN 1 ELSE 0 END) AS vn_differs_utc_count
FROM sites s
LEFT JOIN tour_departures td ON td.site_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY s.id;
```

### Query 3: Time distribution by site
```sql
SELECT
  s.code AS site_code,
  substr(td.departure_date, 12, 8) AS time_part,
  count(td.id) AS count
FROM tour_departures td
JOIN sites s ON s.id = td.site_id
GROUP BY s.code, time_part
ORDER BY s.code, count DESC;
```

---

## 3. Local Audit Results

### Summary Table
| Metric | Value |
|---|---|
| Total `tour_departures` rows | **164** |
| Total with VN day ≠ UTC day | **0 (0.0%)** |
| Time-of-day: `00:00:00Z` | **164 (100.0%)** |
| Time-of-day: `12:00:00Z` | **0 (0.0%)** |
| Time-of-day: `17:00:00Z` | **0 (0.0%)** |
| Time-of-day: other | **0 (0.0%)** |

### Breakdown by Site
| Site ID | Site Code | Site Name | Total Departures | VN ≠ UTC Count | Time Distribution |
|---|---|---|---|---|---|
| 1 | `wings-go` | WingsGo | 39 | 0 | 100% at `00:00:00Z` (39/39) |
| 2 | `wings-group` | WingsGroup | 0 | 0 | None |
| 3 | `wing-side` | WingSide | 125 | 0 | 100% at `00:00:00Z` (125/125) |
| 4 | `wings-pass` | WingsPass | 0 | 0 | None |
| 5 | `wings-plus` | WingsPlus | 0 | 0 | None |
| 6 | `wings-care` | WingsCare | 0 | 0 | None |

**Finding:** In the local environment, 100% of departures are stored at UTC midnight (`00:00:00.000Z`). In UTC+7, `00:00:00.000Z` maps to `07:00:00` on the exact same calendar day, resulting in zero date discrepancy between UTC and VN calendars.

---

## 4. Production-Ready Read-Only Query (PostgreSQL)

For running on staging / production PostgreSQL instances (e.g., via `psql` or read-only admin session):

```sql
-- Query A: Global time-of-day distribution in UTC
SELECT
  TO_CHAR(departure_date AT TIME ZONE 'UTC', 'HH24:MI:SS') AS time_of_day_utc,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM tour_departures
GROUP BY time_of_day_utc
ORDER BY count DESC;

-- Query B: Site breakdown and VN vs UTC date discrepancy
SELECT
  s.id AS site_id,
  s.code AS site_code,
  s.name AS site_name,
  COUNT(td.id) AS total_departures,
  SUM(
    CASE
      WHEN DATE(td.departure_date AT TIME ZONE 'UTC') <> DATE(td.departure_date AT TIME ZONE 'Asia/Ho_Chi_Minh')
      THEN 1
      ELSE 0
    END
  ) AS vn_differs_utc_count,
  SUM(CASE WHEN TO_CHAR(td.departure_date AT TIME ZONE 'UTC', 'HH24:MI:SS') = '00:00:00' THEN 1 ELSE 0 END) AS count_00_00_z,
  SUM(CASE WHEN TO_CHAR(td.departure_date AT TIME ZONE 'UTC', 'HH24:MI:SS') = '12:00:00' THEN 1 ELSE 0 END) AS count_12_00_z,
  SUM(CASE WHEN TO_CHAR(td.departure_date AT TIME ZONE 'UTC', 'HH24:MI:SS') = '17:00:00' THEN 1 ELSE 0 END) AS count_17_00_z,
  SUM(CASE WHEN TO_CHAR(td.departure_date AT TIME ZONE 'UTC', 'HH24:MI:SS') NOT IN ('00:00:00', '12:00:00', '17:00:00') THEN 1 ELSE 0 END) AS count_other_time
FROM sites s
LEFT JOIN tour_departures td ON td.site_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY s.id;
```

---

## 5. Scope Boundary Note

In accordance with Phase 0 brief constraints:
- `groupDeparturesByMonth` in `app/src/tours/utils.ts` and detail-page code were **not changed** in Phase 0.
- Orchestrator review and production execution will determine the Phase 1 path.

---

## 6. Production Audit Results (2026-10-29)

- **Approval:** người dùng đồng ý chạy truy vấn chỉ đọc trên production (2026-10-29).
- **Target:** Oracle VPS `instance-20260604-2317`, container `wingstravel-postgres-1` (`postgres:16-alpine`), qua SSH theo `docs/accounts.md`.
- **Safety:** `SET default_transaction_read_only = on`, `BEGIN READ ONLY` … `ROLLBACK`; chỉ chạy Query A và Query B ở mục 4. Không ghi dữ liệu, không restart, không deploy.
- **Kiểm tra bổ sung:** cột `tour_departures.departure_date` là `timestamp with time zone`; session `TimeZone = UTC`; khoảng dữ liệu 2026-01-24 → 2027-11-06; 214 departure từ hiện tại trở đi.

| Site | Departures | VN ≠ UTC | 00:00Z | 12:00Z | 17:00Z | Khác |
|---|---|---|---|---|---|---|
| `wings-group` | 5 | 0 | 5 | 0 | 0 | 0 |
| `wings-go` | 296 | 0 | 296 | 0 | 0 | 0 |
| `wing-side` | 22 | 0 | 22 | 0 | 0 | 0 |
| `wings-pass`, `wings-plus`, `wings-care` | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tổng** | **323** | **0** | **323 (100%)** | 0 | 0 | 0 |

**Kết luận:** production có 0 departure lệch ngày giữa lịch VN và UTC. Theo quy tắc trang detail trong `design.md` (0 khác biệt ⇒ chuyển helper), `groupDeparturesByMonth` được phép chuyển sang helper lịch nghiệp vụ VN, kèm snapshot WingSide để chứng minh output không đổi. Việc này được lên lịch cùng Phase 2, không làm trong Phase 1b.
